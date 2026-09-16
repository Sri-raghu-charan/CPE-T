import { Types } from 'mongoose';
import {
  DonorModel,
  IDonor,
  BloodGroup,
  DonorAvailabilityStatus,
  ContactPreference,
  NotificationModel,
} from '@cpet/database';
import { memoryStore, MemoryDonor } from '../../infrastructure/store.js';
import { socketManager } from '../../infrastructure/socket.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface RegisterDonorInput {
  bloodGroup: BloodGroup;
  approximateLocation: {
    locality?: string;
    municipality?: string; // town / city
    subDistrict?: string; // mandal / taluk
    district?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number]; // [lon, lat]
  };
  contactPreference?: ContactPreference;
  contactPhone: string;
  contactEmail?: string;
  availabilityStatus?: DonorAvailabilityStatus;
}

export interface BloodSearchQuery {
  bloodGroup: BloodGroup;
  locality?: string;
  municipality?: string;
  subDistrict?: string;
  district?: string;
  state?: string;
  coordinates?: [number, number]; // [lon, lat]
  radiusKm?: number; // Configurable radius
  maxResults?: number;
}

export interface PublicDonorProfile {
  id: string;
  anonymousDonorCode: string;
  bloodGroup: BloodGroup;
  availabilityStatus: DonorAvailabilityStatus;
  approximateLocation: {
    locality?: string;
    municipality?: string;
    subDistrict?: string;
    district?: string;
    state?: string;
  };
  distanceKm?: number;
  hierarchyLevel: 1 | 2 | 3 | 4 | 5;
  hierarchyLabel: string;
  contactPreference: ContactPreference;
  lastDonatedAt?: Date;
}

export interface HierarchyLevelGroup {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  count: number;
  donors: PublicDonorProfile[];
}

export interface BloodDiscoveryResult {
  bloodGroup: BloodGroup;
  searchRadiusKm?: number;
  totalAvailable: number;
  hierarchy: HierarchyLevelGroup[];
  results: PublicDonorProfile[];
}

export interface ContactDonorInput {
  anonymousDonorCode: string;
  caseId?: string;
  hospitalName: string;
  unitsNeeded: number;
  urgency: string;
  attendantPhone: string;
  message?: string;
}

export class BloodService {
  /**
   * Calculates Haversine distance in kilometers between two [lon, lat] coordinates.
   */
  public calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Earth radius in km

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Registers a user as a voluntary blood donor with an anonymous donor code.
   */
  public async registerDonor(input: RegisterDonorInput, userId?: string): Promise<{ anonymousDonorCode: string; id: string }> {
    const isDb = memoryStore.isDbConnected();

    // Default coordinates based on city if not explicitly supplied
    const coordinates = input.approximateLocation.coordinates || this.getDefaultCoordinates(
      input.approximateLocation.municipality || input.approximateLocation.locality || 'Hyderabad'
    );

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cityCode = (input.approximateLocation.municipality || input.approximateLocation.locality || 'IND')
      .slice(0, 3)
      .toUpperCase();
    const anonymousDonorCode = `DONOR-${cityCode}-${randomSuffix}`;

    if (isDb) {
      const donor = await DonorModel.create({
        userId: userId ? new Types.ObjectId(userId) : undefined,
        anonymousDonorCode,
        bloodGroup: input.bloodGroup,
        availabilityStatus: input.availabilityStatus || 'AVAILABLE',
        approximateLocation: {
          ...input.approximateLocation,
          coordinates,
        },
        contactPreference: input.contactPreference || 'IN_APP',
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        isVerified: true,
      });

      return { anonymousDonorCode: donor.anonymousDonorCode, id: donor._id.toString() };
    } else {
      const id = new Types.ObjectId().toString();
      const memDonor: MemoryDonor = {
        _id: id,
        userId,
        anonymousDonorCode,
        bloodGroup: input.bloodGroup,
        availabilityStatus: input.availabilityStatus || 'AVAILABLE',
        approximateLocation: {
          ...input.approximateLocation,
          coordinates,
        },
        contactPreference: input.contactPreference || 'IN_APP',
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.donors.set(id, memDonor);
      return { anonymousDonorCode, id };
    }
  }

  /**
   * Retrieves donor profile for authenticated owner.
   */
  public async getDonorProfileByUserId(userId: string): Promise<any | null> {
    const isDb = memoryStore.isDbConnected();
    if (isDb) {
      return await DonorModel.findOne({ userId: new Types.ObjectId(userId) }).lean();
    } else {
      return Array.from(memoryStore.donors.values()).find((d) => d.userId === userId) || null;
    }
  }

  /**
   * Updates availability status for authenticated donor.
   */
  public async updateDonorStatus(userId: string, status: DonorAvailabilityStatus): Promise<boolean> {
    const isDb = memoryStore.isDbConnected();
    if (isDb) {
      const res = await DonorModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { availabilityStatus: status, updatedAt: new Date() }
      );
      return res.modifiedCount > 0;
    } else {
      const donor = Array.from(memoryStore.donors.values()).find((d) => d.userId === userId);
      if (donor) {
        donor.availabilityStatus = status;
        donor.updatedAt = new Date();
        return true;
      }
      return false;
    }
  }

  /**
   * Progressive 5-Level Blood Discovery Engine.
   * Searches availability hierarchically:
   * LEVEL 1: Same locality (approx < 5km)
   * LEVEL 2: Same village/town/municipality (approx < 15km)
   * LEVEL 3: Same mandal/sub-district (approx < 30km)
   * LEVEL 4: Same district (approx < 75km)
   * LEVEL 5: Same state (statewide)
   *
   * STRICT PRIVACY: Redacts donor phone, email, and exact coordinates.
   */
  public async searchBloodAvailability(query: BloodSearchQuery): Promise<BloodDiscoveryResult> {
    const isDb = memoryStore.isDbConnected();
    const radiusLimit = query.radiusKm || 100;
    const reqCoords = query.coordinates || this.getDefaultCoordinates(query.municipality || query.locality || 'Hyderabad');

    let allDonors: any[] = [];

    if (isDb) {
      // Find matching available donors
      allDonors = await DonorModel.find({
        bloodGroup: query.bloodGroup,
        availabilityStatus: 'AVAILABLE',
      }).lean();
    } else {
      allDonors = Array.from(memoryStore.donors.values()).filter(
        (d) => d.bloodGroup === query.bloodGroup && d.availabilityStatus === 'AVAILABLE'
      );
    }

    const publicProfiles: PublicDonorProfile[] = [];

    for (const donor of allDonors) {
      const donorCoords = donor.approximateLocation?.coordinates;
      let distanceKm: number | undefined;

      if (reqCoords && donorCoords && donorCoords.length === 2) {
        distanceKm = this.calculateDistance(reqCoords, donorCoords as [number, number]);
      }

      // Check radius constraint if requested
      if (query.radiusKm && distanceKm !== undefined && distanceKm > query.radiusKm) {
        continue;
      }

      // Determine Progressive Hierarchy Level (1 through 5)
      const { level, label } = this.determineHierarchyLevel(query, donor, distanceKm);

      // Strict privacy sanitization: No phone, no email, no exact street coordinates!
      publicProfiles.push({
        id: donor._id.toString(),
        anonymousDonorCode: donor.anonymousDonorCode,
        bloodGroup: donor.bloodGroup as BloodGroup,
        availabilityStatus: donor.availabilityStatus as DonorAvailabilityStatus,
        approximateLocation: {
          locality: donor.approximateLocation?.locality,
          municipality: donor.approximateLocation?.municipality,
          subDistrict: donor.approximateLocation?.subDistrict,
          district: donor.approximateLocation?.district,
          state: donor.approximateLocation?.state,
        },
        distanceKm,
        hierarchyLevel: level,
        hierarchyLabel: label,
        contactPreference: donor.contactPreference as ContactPreference,
        lastDonatedAt: donor.lastDonatedAt,
      });
    }

    // Sort by hierarchy level ascending (Level 1 first, then 2, 3, 4, 5), then by distance
    publicProfiles.sort((a, b) => {
      if (a.hierarchyLevel !== b.hierarchyLevel) {
        return a.hierarchyLevel - b.hierarchyLevel;
      }
      return (a.distanceKm || 999) - (b.distanceKm || 999);
    });

    // Group into 5-level hierarchy
    const hierarchyGroups: HierarchyLevelGroup[] = [
      {
        level: 1,
        label: 'Level 1: Same Locality',
        description: 'Immediate neighborhood / locality (approx. < 5 km)',
        count: publicProfiles.filter((p) => p.hierarchyLevel === 1).length,
        donors: publicProfiles.filter((p) => p.hierarchyLevel === 1),
      },
      {
        level: 2,
        label: 'Level 2: Same Municipality / Town',
        description: 'Within same town or municipality (approx. < 15 km)',
        count: publicProfiles.filter((p) => p.hierarchyLevel === 2).length,
        donors: publicProfiles.filter((p) => p.hierarchyLevel === 2),
      },
      {
        level: 3,
        label: 'Level 3: Same Mandal / Sub-District',
        description: 'Within same administrative mandal / sub-district (approx. < 30 km)',
        count: publicProfiles.filter((p) => p.hierarchyLevel === 3).length,
        donors: publicProfiles.filter((p) => p.hierarchyLevel === 3),
      },
      {
        level: 4,
        label: 'Level 4: Same District',
        description: 'Within same regional district (approx. < 75 km)',
        count: publicProfiles.filter((p) => p.hierarchyLevel === 4).length,
        donors: publicProfiles.filter((p) => p.hierarchyLevel === 4),
      },
      {
        level: 5,
        label: 'Level 5: Same State',
        description: 'Wider regional & statewide network (> 75 km)',
        count: publicProfiles.filter((p) => p.hierarchyLevel === 5).length,
        donors: publicProfiles.filter((p) => p.hierarchyLevel === 5),
      },
    ];

    return {
      bloodGroup: query.bloodGroup,
      searchRadiusKm: query.radiusKm,
      totalAvailable: publicProfiles.length,
      hierarchy: hierarchyGroups,
      results: query.maxResults ? publicProfiles.slice(0, query.maxResults) : publicProfiles,
    };
  }

  /**
   * Evaluates administrative hierarchy level (1 to 5).
   */
  private determineHierarchyLevel(
    query: BloodSearchQuery,
    donor: any,
    distanceKm?: number
  ): { level: 1 | 2 | 3 | 4 | 5; label: string } {
    const qLoc = (query.locality || '').trim().toLowerCase();
    const qMuni = (query.municipality || '').trim().toLowerCase();
    const qSub = (query.subDistrict || '').trim().toLowerCase();
    const qDist = (query.district || '').trim().toLowerCase();
    const qState = (query.state || '').trim().toLowerCase();

    const dLoc = (donor.approximateLocation?.locality || '').trim().toLowerCase();
    const dMuni = (donor.approximateLocation?.municipality || '').trim().toLowerCase();
    const dSub = (donor.approximateLocation?.subDistrict || '').trim().toLowerCase();
    const dDist = (donor.approximateLocation?.district || '').trim().toLowerCase();
    const dState = (donor.approximateLocation?.state || '').trim().toLowerCase();

    // Progressive Administrative Hierarchy
    if (qLoc && dLoc && qLoc === dLoc) {
      return { level: 1, label: 'Same Locality' };
    }
    if (qMuni && dMuni && qMuni === dMuni) {
      return { level: 2, label: 'Same Municipality' };
    }
    if (qSub && dSub && qSub === dSub) {
      return { level: 3, label: 'Same Mandal / Sub-District' };
    }
    if (qDist && dDist && qDist === dDist) {
      return { level: 4, label: 'Same District' };
    }
    if (qState && dState && qState === dState) {
      return { level: 5, label: 'Same State' };
    }

    // Distance-based evaluation if administrative levels differ
    if (distanceKm !== undefined) {
      if (distanceKm <= 5) return { level: 1, label: 'Same Locality' };
      if (distanceKm <= 15) return { level: 2, label: 'Same Municipality' };
      if (distanceKm <= 35) return { level: 3, label: 'Same Mandal / Sub-District' };
      if (distanceKm <= 75) return { level: 4, label: 'Same District' };
      return { level: 5, label: 'Same State' };
    }

    // LEVEL 5: Same state OR wider network
    return { level: 5, label: 'Same State' };
  }

  /**
   * Safe Contact / Alert Relay Mechanism.
   * Sends alert to voluntary donor without disclosing donor's personal phone or identity to requester.
   */
  public async contactDonorRelay(
    input: ContactDonorInput,
    requesterUser: { userId: string; name?: string; phone?: string; email?: string }
  ): Promise<{ success: boolean; message: string; relayId: string }> {
    const isDb = memoryStore.isDbConnected();
    let donor: any = null;

    if (isDb) {
      donor = await DonorModel.findOne({ anonymousDonorCode: input.anonymousDonorCode }).lean();
    } else {
      donor = Array.from(memoryStore.donors.values()).find(
        (d) => d.anonymousDonorCode === input.anonymousDonorCode
      );
    }

    if (!donor) {
      throw new NotFoundError(`Donor code '${input.anonymousDonorCode}' not found.`);
    }

    if (donor.availabilityStatus !== 'AVAILABLE') {
      throw new ValidationError(`Donor '${input.anonymousDonorCode}' is currently unavailable.`);
    }

    const relayId = `RELAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // Create safe in-app notification to donor
    if (donor.userId) {
      const notifTitle = `Urgent Blood Request: ${donor.bloodGroup} needed at ${input.hospitalName}`;
      const notifMsg = `A citizen requires ${input.unitsNeeded} unit(s) of ${donor.bloodGroup} blood at ${input.hospitalName} (${input.urgency}). Emergency contact: ${input.attendantPhone}. Safe relay ID: ${relayId}.`;

      if (isDb) {
        await NotificationModel.create({
          recipientUserId: donor.userId,
          type: 'SLA_ALERT',
          title: notifTitle,
          message: notifMsg,
          caseId: input.caseId ? new Types.ObjectId(input.caseId) : undefined,
          isRead: false,
        });
      } else {
        memoryStore.notifications.set(relayId, {
          _id: relayId,
          recipientUserId: donor.userId.toString(),
          type: 'SLA_ALERT',
          title: notifTitle,
          message: notifMsg,
          caseId: input.caseId,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Emit live socket event to donor's user room
      socketManager.emitToUser(donor.userId.toString(), 'donor:emergency_alert', {
        relayId,
        bloodGroup: donor.bloodGroup,
        hospitalName: input.hospitalName,
        unitsNeeded: input.unitsNeeded,
        urgency: input.urgency,
        message: input.message || 'Urgent requirement matched in your locality.',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`[BloodRelay] Safe relay dispatch '${relayId}' sent to donor ${donor.anonymousDonorCode} via ${donor.contactPreference}`);

    return {
      success: true,
      relayId,
      message: `Emergency alert sent safely to voluntary donor ${donor.anonymousDonorCode} via ${donor.contactPreference}. The donor has been notified with the hospital details and attendant contact.`,
    };
  }

  /**
   * Reference coordinate helpers for popular Telangana / Hyderabad centers.
   */
  private getDefaultCoordinates(locationName: string): [number, number] {
    const lower = locationName.toLowerCase();
    if (lower.includes('madhapur') || lower.includes('hitec')) return [78.3845, 17.4483];
    if (lower.includes('gachibowli')) return [78.3578, 17.4401];
    if (lower.includes('serilingampally')) return [78.3182, 17.4851];
    if (lower.includes('secunderabad')) return [78.501, 17.4399];
    if (lower.includes('begumpet')) return [78.4738, 17.4435];
    if (lower.includes('hyderabad')) return [78.4867, 17.385];
    if (lower.includes('warangal')) return [79.5941, 17.9689];
    if (lower.includes('bangalore') || lower.includes('bengaluru')) return [77.5946, 12.9716];
    return [78.4867, 17.385]; // Default central Hyderabad
  }
}

export const bloodService = new BloodService();
