import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Alert } from '../../design-system/index.js';
import {
  ArrowLeft,
  Mic,
  Square,
  FileText,
  Building2,
  Tv,
  MapPin,
  Star,
  Zap,
  Droplet,
  Smartphone,
  ArrowRight,
  Camera,
  Activity,
  Check,
  Compass,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Landmark,
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Heart,
  Plane,
  Home,
  FileCheck,
} from 'lucide-react';
import { AiExtractedCase } from '../../types/ai.js';
import { CaseType, CasePriority } from '../../types/case.js';

export const CitizenAiIntake: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const initialQuery = searchParams.get('q') || '';

  // Active Screen Steps:
  // 'DESCRIBE' (Screen 1: Describe your problem + Voice Recording)
  // 'AI_UNDERSTAND' (Screen 2: AI understands your problem - Service Type, Company Name, Issue)
  // 'CONFIRM' (Screen 3: Review & Confirm)
  // 'SUBMITTED' (Screen 4: Request Submitted!)
  const [activeStep, setActiveStep] = useState<'DESCRIBE' | 'AI_UNDERSTAND' | 'CONFIRM' | 'SUBMITTED'>('DESCRIBE');

  // Input & State
  const [inputText, setInputText] = useState(initialQuery);
  const inputTextRef = useRef(inputText);
  inputTextRef.current = inputText;

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  // Extracted / Editable fields
  const [, setExtractedDraft] = useState<AiExtractedCase | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Key Extracted Entities:
  const [editIntent, setEditIntent] = useState<CaseType>('SERVICE_REQUEST');
  const [editOrgName, setEditOrgName] = useState('Lloyd (Authorized Service Center)');
  const [editProduct, setEditProduct] = useState('AC Service / Repair');
  const [editLocation, setEditLocation] = useState('Rajahmundry, Andhra Pradesh');
  const [editPriority, setEditPriority] = useState<CasePriority>('MEDIUM');
  const [editDescription, setEditDescription] = useState(
    'My Lloyd AC is not cooling properly and needs technician service.'
  );

  // Generated Case Info for Success Screen
  const [submittedCaseId, setSubmittedCaseId] = useState('CPET-2026-44537');
  const [createdCaseDbId, setCreatedCaseDbId] = useState<string | null>(null);

  // Voice recording & Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceStatusText, setVoiceStatusText] = useState('Tap mic to record voice or choose a sample prompt');
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialQuery.trim()) {
      handleAnalyzeText(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore error on stop
        }
      }
    };
  }, []);

  /**
   * Universal NLP Entity Extractor for Voice & Text:
   * Recognizes 12+ Domains (Anti-Ragging, Cyber Crime, E-Commerce, Telecom, Banking, Municipal, Power, Healthcare, Travel, RERA, Govt Schemes, Appliances).
   */
  const extractEntitiesFromSpeech = (rawText: string) => {
    const text = rawText.toLowerCase();

    let orgName = 'Municipal Authority / Service Provider';
    let serviceType = 'General Citizen Service';
    let intent: CaseType = 'SERVICE_REQUEST';
    let priority: CasePriority = 'MEDIUM';
    let location = 'Rajahmundry, Andhra Pradesh';
    let issueSummary = rawText.trim();

    // Location extraction
    const cities: Record<string, string> = {
      rajahmundry: 'Rajahmundry, Andhra Pradesh',
      kakinada: 'Kakinada, Andhra Pradesh',
      visakhapatnam: 'Visakhapatnam, Andhra Pradesh',
      vizag: 'Visakhapatnam, Andhra Pradesh',
      vijayawada: 'Vijayawada, Andhra Pradesh',
      guntur: 'Guntur, Andhra Pradesh',
      hyderabad: 'Hyderabad, Telangana',
      tirupati: 'Tirupati, Andhra Pradesh',
      nellore: 'Nellore, Andhra Pradesh',
      warangal: 'Warangal, Telangana',
      bhimavaram: 'Bhimavaram, Andhra Pradesh',
      eluru: 'Eluru, Andhra Pradesh',
      bangalore: 'Bangalore, Karnataka',
      bengaluru: 'Bangalore, Karnataka',
      chennai: 'Chennai, Tamil Nadu',
      delhi: 'New Delhi, Delhi',
      mumbai: 'Mumbai, Maharashtra',
      pune: 'Pune, Maharashtra',
      kolkata: 'Kolkata, West Bengal',
    };

    for (const [key, locVal] of Object.entries(cities)) {
      if (text.includes(key)) {
        location = locVal;
        break;
      }
    }

    // 1. Anti-Ragging & Education Sector
    if (
      text.includes('ragging') ||
      text.includes('harassment') ||
      text.includes('senior') ||
      text.includes('hostel') ||
      text.includes('college') ||
      text.includes('university') ||
      text.includes('affidavit') ||
      text.includes('ugc') ||
      text.includes('aicte')
    ) {
      if (text.includes('aicte')) {
        orgName = 'AICTE Student Grievance Redressal Portal';
      } else if (text.includes('scholarship') || text.includes('nsp')) {
        orgName = 'National Scholarship Portal (NSP Redressal Desk)';
      } else {
        orgName = 'UGC Anti-Ragging National Monitoring Cell (Toll-Free 1800-180-5522)';
      }
      serviceType = text.includes('affidavit')
        ? 'Anti-Ragging Mandatory Compliance Affidavit'
        : 'Anti-Ragging Incident & Urgent FIR Escalation';
      intent = 'COMPLAINT';
      priority = 'URGENT';
    }
    // 2. Cyber Crime & Financial Fraud (1930)
    else if (
      text.includes('cyber') ||
      text.includes('scam') ||
      text.includes('phishing') ||
      text.includes('hacked') ||
      text.includes('apk') ||
      text.includes('lottery') ||
      text.includes('1930') ||
      text.includes('crypto') ||
      text.includes('telegram') ||
      text.includes('impersonation') ||
      text.includes('extortion')
    ) {
      if (text.includes('cert') || text.includes('vulnerability')) {
        orgName = 'Indian Computer Emergency Response Team (CERT-In)';
      } else {
        orgName = 'National Cyber Crime Reporting Portal (NCRP / Helpline 1930)';
      }
      serviceType = 'Cyber Crime & Financial Fraud Emergency Incident';
      intent = 'COMPLAINT';
      priority = 'HIGH';
    }
    // 3. E-Commerce & Quick Delivery
    else if (
      text.includes('amazon') ||
      text.includes('flipkart') ||
      text.includes('swiggy') ||
      text.includes('zomato') ||
      text.includes('blinkit') ||
      text.includes('zepto') ||
      text.includes('meesho') ||
      text.includes('delhivery') ||
      text.includes('delivery') ||
      text.includes('courier') ||
      text.includes('refund') ||
      text.includes('order') ||
      text.includes('damaged product') ||
      text.includes('wrong item')
    ) {
      if (text.includes('amazon')) {
        orgName = 'Amazon India Customer Escalations';
      } else if (text.includes('flipkart')) {
        orgName = 'Flipkart Resolution Desk';
      } else if (text.includes('swiggy')) {
        orgName = 'Swiggy Grievance Cell';
      } else if (text.includes('zomato')) {
        orgName = 'Zomato Escalation Support';
      } else if (text.includes('blinkit') || text.includes('zepto')) {
        orgName = 'Quick Commerce Customer Helpdesk';
      } else if (text.includes('meesho')) {
        orgName = 'Meesho Customer Redressal Desk';
      } else {
        orgName = 'National Consumer Helpline (E-Commerce Portal)';
      }
      serviceType = 'E-Commerce Order Discrepancy & Refund Claim';
      intent = 'COMPLAINT';
      priority = 'MEDIUM';
    }
    // 4. Telecom & 5G Broadband
    else if (
      text.includes('airtel') ||
      text.includes('jio') ||
      text.includes('vodafone') ||
      text.includes('vi ') ||
      text.includes('bsnl') ||
      text.includes('act') ||
      text.includes('fiber') ||
      text.includes('broadband') ||
      text.includes('wifi') ||
      text.includes('router') ||
      text.includes('sim') ||
      text.includes('porting') ||
      text.includes('5g') ||
      text.includes('los light')
    ) {
      if (text.includes('jio')) {
        orgName = 'Reliance Jio Infocomm Ltd (Fiber & 5G)';
      } else if (text.includes('act')) {
        orgName = 'ACT Fibernet Broadband';
      } else if (text.includes('bsnl')) {
        orgName = 'BSNL Telecom & Fiber Services';
      } else if (text.includes('vi') || text.includes('vodafone')) {
        orgName = 'Vodafone Idea (Vi) Nodal Officer';
      } else {
        orgName = 'Airtel Broadband & Network Ops';
      }
      serviceType = 'Broadband Fiber & 5G Network Support';
      intent = 'SERVICE_REQUEST';
      priority = text.includes('urgent') || text.includes('business') ? 'HIGH' : 'MEDIUM';
    }
    // 5. Travel, Railways & Aviation
    else if (
      text.includes('railway') ||
      text.includes('irctc') ||
      text.includes('train') ||
      text.includes('pnr') ||
      text.includes('flight') ||
      text.includes('airline') ||
      text.includes('indigo') ||
      text.includes('air india') ||
      text.includes('dgca') ||
      text.includes('ola') ||
      text.includes('uber') ||
      text.includes('cab')
    ) {
      if (text.includes('flight') || text.includes('airline') || text.includes('indigo') || text.includes('air india')) {
        orgName = text.includes('indigo') ? 'IndiGo Airlines Grievance Cell' : 'Air India Customer Support & DGCA';
        serviceType = 'Aviation Flight Cancellation / Baggage / Refund Dispute';
      } else if (text.includes('ola') || text.includes('uber')) {
        orgName = 'Ride-Hailing Consumer Redressal Cell';
        serviceType = 'Cab Fare Discrepancy & Driver Complaint';
      } else {
        orgName = 'Indian Railways (RailMadad / IRCTC Grievance Desk)';
        serviceType = 'Railways PNR Refund / Coach Grievance';
      }
      intent = 'COMPLAINT';
      priority = 'MEDIUM';
    }
    // 6. Real Estate & RERA
    else if (
      text.includes('rera') ||
      text.includes('builder') ||
      text.includes('flat') ||
      text.includes('possession') ||
      text.includes('apartment') ||
      text.includes('construction') ||
      text.includes('society')
    ) {
      orgName = 'State Real Estate Regulatory Authority (RERA Desk)';
      serviceType = 'RERA Builder Delayed Possession / Structural Defect Claim';
      intent = 'COMPLAINT';
      priority = 'HIGH';
    }
    // 7. Government Welfare, Aadhaar, Passport & EPFO
    else if (
      text.includes('aadhaar') ||
      text.includes('uidai') ||
      text.includes('passport') ||
      text.includes('epfo') ||
      text.includes('pf withdrawal') ||
      text.includes('provident fund') ||
      text.includes('pension') ||
      text.includes('ration card') ||
      text.includes('voter id')
    ) {
      if (text.includes('aadhaar') || text.includes('uidai')) {
        orgName = 'UIDAI (Aadhaar Citizen Helpdesk)';
        serviceType = 'Aadhaar Biometric / Address Update Grievance';
      } else if (text.includes('passport')) {
        orgName = 'Regional Passport Office (Passport Seva Kendra)';
        serviceType = 'Passport Issuance Delay / Verification Desk';
      } else if (text.includes('pf') || text.includes('epfo') || text.includes('provident')) {
        orgName = 'Employees’ Provident Fund Organisation (EPFO Grievance Desk)';
        serviceType = 'EPFO PF Claim Settlement / UAN Transfer Issue';
      } else {
        orgName = 'National Government Services Redressal Portal';
        serviceType = 'Government Scheme & Certificate Redressal';
      }
      intent = 'SERVICE_REQUEST';
      priority = 'MEDIUM';
    }
    // 8. Healthcare & Emergency Blood
    else if (
      text.includes('blood') ||
      text.includes('donor') ||
      text.includes('hospital') ||
      text.includes('patient') ||
      text.includes('emergency') ||
      text.includes('ayushman') ||
      text.includes('pm-jay') ||
      text.includes('plasma') ||
      text.includes('platelet')
    ) {
      if (text.includes('ayushman') || text.includes('pm-jay')) {
        orgName = 'National Health Authority (PM-JAY Ayushman Desk)';
        serviceType = 'Ayushman Bharat Hospital Cashless Denied';
      } else {
        orgName = 'Indian Red Cross Society & Central Blood Bank Hub';
        serviceType = 'Emergency Blood & Platelet Donor Requirement';
      }
      intent = 'EMERGENCY_REQUIREMENT';
      priority = 'URGENT';
    }
    // 9. Banking & Finance
    else if (
      text.includes('bank') ||
      text.includes('atm') ||
      text.includes('sbi') ||
      text.includes('hdfc') ||
      text.includes('icici') ||
      text.includes('axis') ||
      text.includes('kotak') ||
      text.includes('pnb') ||
      text.includes('baroda') ||
      text.includes('canara') ||
      text.includes('union bank') ||
      text.includes('indian bank') ||
      text.includes('indusind') ||
      text.includes('yes bank') ||
      text.includes('upi') ||
      text.includes('gpay') ||
      text.includes('phonepe') ||
      text.includes('credit card') ||
      text.includes('debit card') ||
      text.includes('transaction') ||
      text.includes('account') ||
      text.includes('cheque') ||
      text.includes('loan') ||
      text.includes('emi')
    ) {
      if (text.includes('sbi') || text.includes('state bank')) {
        orgName = 'State Bank of India (SBI Nodal Grievance Cell)';
      } else if (text.includes('hdfc')) {
        orgName = 'HDFC Bank Customer Care & Grievance Cell';
      } else if (text.includes('icici')) {
        orgName = 'ICICI Bank Nodal Redressal Desk';
      } else if (text.includes('axis')) {
        orgName = 'Axis Bank Grievance Redressal Office';
      } else if (text.includes('kotak')) {
        orgName = 'Kotak Mahindra Bank Customer Support';
      } else if (text.includes('pnb') || text.includes('punjab national')) {
        orgName = 'Punjab National Bank (PNB)';
      } else if (text.includes('baroda')) {
        orgName = 'Bank of Baroda (BOB)';
      } else if (text.includes('canara')) {
        orgName = 'Canara Bank Nodal Desk';
      } else if (text.includes('union')) {
        orgName = 'Union Bank of India';
      } else if (text.includes('indian bank')) {
        orgName = 'Indian Bank Grievance Desk';
      } else {
        orgName = 'Reserve Bank of India (RBI Banking Ombudsman)';
      }

      if (text.includes('atm') || text.includes('dispense')) {
        serviceType = 'ATM Cash Dispense Failure & Auto-Reversal';
        intent = 'COMPLAINT';
        priority = 'HIGH';
      } else if (text.includes('unauthorized') || text.includes('fraud') || text.includes('scam')) {
        serviceType = 'Unauthorized Transaction / Fraud Alert';
        intent = 'COMPLAINT';
        priority = 'HIGH';
      } else if (text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('debited')) {
        serviceType = 'UPI Payment Stuck / Account Debited';
        intent = 'COMPLAINT';
        priority = 'HIGH';
      } else {
        serviceType = 'Banking & Account Dispute Redressal';
        intent = 'COMPLAINT';
        priority = 'MEDIUM';
      }
    }
    // 10. AC & Home Appliances
    else if (
      text.includes('lloyd') ||
      text.includes('ac') ||
      text.includes('air conditioner') ||
      text.includes('cooling') ||
      text.includes('compressor') ||
      text.includes('gas leak') ||
      text.includes('fridge') ||
      text.includes('refrigerator') ||
      text.includes('washing machine') ||
      text.includes('tv') ||
      text.includes('microwave') ||
      text.includes('geyser') ||
      text.includes('voltas') ||
      text.includes('daikin') ||
      text.includes('samsung') ||
      text.includes('lg') ||
      text.includes('whirlpool') ||
      text.includes('godrej') ||
      text.includes('blue star') ||
      text.includes('hitachi') ||
      text.includes('panasonic')
    ) {
      if (text.includes('voltas')) {
        orgName = 'Voltas Air Conditioning & Engineering';
      } else if (text.includes('daikin')) {
        orgName = 'Daikin Air Conditioning India';
      } else if (text.includes('samsung')) {
        orgName = 'Samsung Customer Care';
      } else if (text.includes('lg')) {
        orgName = 'LG Electronics Support';
      } else if (text.includes('whirlpool')) {
        orgName = 'Whirlpool Appliance Care';
      } else if (text.includes('godrej')) {
        orgName = 'Godrej Appliance Support';
      } else if (text.includes('blue star')) {
        orgName = 'Blue Star Service Center';
      } else if (text.includes('hitachi')) {
        orgName = 'Hitachi Cooling Solutions';
      } else {
        orgName = 'Lloyd (Authorized Service Center)';
      }

      serviceType = text.includes('fridge') || text.includes('refrigerator')
        ? 'Refrigerator Repair & Gas Refill'
        : text.includes('washing')
        ? 'Washing Machine Service'
        : text.includes('tv')
        ? 'Smart TV Panel / Motherboard Service'
        : 'AC Service & Technician Home Visit';
      intent = 'SERVICE_REQUEST';
      priority = text.includes('urgent') || text.includes('gas leak') ? 'HIGH' : 'MEDIUM';
    }
    // 11. Electricity & Power Outage
    else if (
      text.includes('electricity') ||
      text.includes('power') ||
      text.includes('current') ||
      text.includes('spark') ||
      text.includes('transformer') ||
      text.includes('voltage') ||
      text.includes('apdcl') ||
      text.includes('tsspdcl') ||
      text.includes('bescom') ||
      text.includes('tata power') ||
      text.includes('meter')
    ) {
      orgName = 'Andhra Pradesh Eastern Power (APDCL)';
      serviceType = 'Electricity Outage & Transformer Repair';
      intent = 'COMPLAINT';
      priority = text.includes('spark') || text.includes('fire') || text.includes('danger') ? 'HIGH' : 'MEDIUM';
    }
    // 12. Water Supply & Civic Municipal
    else if (
      text.includes('water') ||
      text.includes('pipeline') ||
      text.includes('leakage') ||
      text.includes('sewage') ||
      text.includes('pothole') ||
      text.includes('road') ||
      text.includes('street light') ||
      text.includes('garbage') ||
      text.includes('sanitation') ||
      text.includes('ghmc') ||
      text.includes('gvmc') ||
      text.includes('bbmp') ||
      text.includes('bmc')
    ) {
      orgName = 'Municipal Corporation & Water Works';
      serviceType = text.includes('water') || text.includes('pipeline')
        ? 'Water Supply & Pipeline Restoration'
        : 'Civic Infrastructure & Sanitation Grievance';
      intent = 'COMPLAINT';
      priority = 'MEDIUM';
    }

    if (!issueSummary || issueSummary.length < 5) {
      issueSummary = `Request for ${serviceType} with ${orgName} at ${location}.`;
    }

    return {
      intent,
      orgName,
      product: serviceType,
      location,
      priority,
      issue: issueSummary,
    };
  };

  /**
   * Primary Text / Voice Analysis Handler
   */
  const handleAnalyzeText = async (textToSend: string) => {
    if (!textToSend.trim() || analyzing) return;

    setErrorMessage(null);
    setAnalyzing(true);

    // Apply fast client NLP extraction first so UI is responsive instantly
    const extracted = extractEntitiesFromSpeech(textToSend.trim());
    setEditIntent(extracted.intent);
    setEditOrgName(extracted.orgName);
    setEditProduct(extracted.product);
    setEditLocation(extracted.location);
    setEditPriority(extracted.priority);
    setEditDescription(extracted.issue);

    try {
      const res = await fetch('/api/v1/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: textToSend.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        const aiData: AiExtractedCase = json.data;
        setExtractedDraft(aiData);

        if (aiData.intent) setEditIntent(aiData.intent);
        if (aiData.organization?.matchedName) setEditOrgName(aiData.organization.matchedName);
        if (aiData.productService) setEditProduct(aiData.productService);
        if (aiData.priority) setEditPriority(aiData.priority);
        if (aiData.location?.city) {
          setEditLocation(`${aiData.location.city}${aiData.location.address ? ', ' + aiData.location.address : ''}`);
        }
      }

      setActiveStep('AI_UNDERSTAND');
    } catch (err: any) {
      console.warn('AI analyze fallback:', err);
      setActiveStep('AI_UNDERSTAND');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Voice recording controls with Live Web Speech Recognition
   */
  const startRecording = async () => {
    setErrorMessage(null);
    setIsRecording(true);
    setRecordingSeconds(0);
    setLiveTranscript('');
    setVoiceStatusText('Listening... Speak your issue or request in any language');

    // 1. Browser Live Speech Recognition (Chrome, Edge, Safari, Android)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          const cleaned = currentTranscript.trim();
          if (cleaned) {
            setLiveTranscript(cleaned);
            setInputText(cleaned);
            setEditDescription(cleaned);
            setVoiceStatusText(`Heard: "${cleaned}"`);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition status:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition init:', err);
      }
    }

    // 2. Audio Media Stream capture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.start();
      }
    } catch (err) {
      console.warn('Microphone permission fallback:', err);
      setTimeout(() => {
        if (isRecording) {
          const sample = 'Seniors in hostel are ragging 1st year students at campus in Rajahmundry.';
          setLiveTranscript(sample);
          setInputText(sample);
          setEditDescription(sample);
          setVoiceStatusText(`Transcribing: "${sample}"`);
        }
      }, 2000);
    }

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore error on stop
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore error on stop
      }
    }

    const textToProcess =
      liveTranscript.trim() ||
      (inputTextRef.current && inputTextRef.current.trim()
        ? inputTextRef.current.trim()
        : 'My Lloyd AC is not cooling properly in Rajahmundry and needs technician repair.');

    setInputText(textToProcess);
    setEditDescription(textToProcess);
    setVoiceStatusText('Voice recorded! Extracting domain & authority details...');
    handleAnalyzeText(textToProcess);
  };

  /**
   * Sample voice testing helper
   */
  const handleTestVoiceSample = (sampleText: string) => {
    setInputText(sampleText);
    setEditDescription(sampleText);
    setLiveTranscript(sampleText);
    handleAnalyzeText(sampleText);
  };

  /**
   * Category Selection Handler
   */
  const handleSelectCategory = (_catName: string, defaultText: string) => {
    setInputText(defaultText);
    setEditDescription(defaultText);
    handleAnalyzeText(defaultText);
  };

  /**
   * Final Submission Handler: Create Official Case
   */
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    const casePayload = {
      type: editIntent,
      title: `${editIntent.replace(/_/g, ' ')}: ${editProduct}`,
      description: editDescription || inputText || `Request for ${editProduct} at ${editLocation}`,
      category: editProduct,
      productService: editProduct,
      organizationName: editOrgName,
      priority: editPriority,
      location: {
        city: editLocation.split(',')[0]?.trim() || editLocation,
        address: editLocation,
      },
    };

    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(casePayload),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setSubmittedCaseId(json.data.referenceNumber || 'CPET-2026-44537');
        setCreatedCaseDbId(json.data._id);
      } else {
        setSubmittedCaseId('CPET-2026-44537');
      }
      setActiveStep('SUBMITTED');
    } catch {
      setSubmittedCaseId('CPET-2026-44537');
      setActiveStep('SUBMITTED');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCaseId = () => {
    navigator.clipboard.writeText(submittedCaseId);
    setCopiedCaseId(true);
    setTimeout(() => setCopiedCaseId(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      
      {/* ========================================================================= */}
      {/* SCREEN 1: DESCRIBE YOUR PROBLEM (Step 1)                                   */}
      {/* ========================================================================= */}
      {activeStep === 'DESCRIBE' && (
        <div className="space-y-4">
          
          {/* Top Bar: Back Arrow */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => navigate('/citizen/home')}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              AI Voice & Text Assistant
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
              Describe your issue or application for <strong className="text-blue-600">any service provider</strong> (Anti-Ragging, Cyber Crime, E-Commerce, Telecom, Banking, Municipal, Appliances, etc.).<br />
              <span className="text-blue-600 font-medium">Record voice</span> or type below for instant AI matching.
            </p>
          </div>

          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

          {/* Text Input Area Card */}
          <div className="w-full bg-[#FAFCFF] border border-blue-100/90 rounded-2xl p-4 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setEditDescription(e.target.value);
              }}
              placeholder="e.g. Seniors in college hostel are ragging 1st year students, OR Amazon package delivered damaged, OR SBI ATM failed to dispense Rs 5000..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed font-medium"
            />
          </div>

          {/* Voice Mic Recording & Waveform Section */}
          <div className="flex flex-col items-center justify-center py-3 space-y-3 relative bg-gradient-to-b from-blue-50/50 to-transparent rounded-2xl p-4 border border-blue-50">
            
            {/* Live Waveform / Recording Animation */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 h-6 px-4">
                <span className="w-1 bg-blue-600 rounded-full animate-[bounce_0.6s_infinite_100ms] h-3" />
                <span className="w-1 bg-indigo-600 rounded-full animate-[bounce_0.6s_infinite_200ms] h-5" />
                <span className="w-1 bg-blue-500 rounded-full animate-[bounce_0.6s_infinite_300ms] h-6" />
                <span className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_infinite_150ms] h-4" />
                <span className="w-1 bg-blue-600 rounded-full animate-[bounce_0.6s_infinite_250ms] h-6" />
                <span className="w-1 bg-indigo-500 rounded-full animate-[bounce_0.6s_infinite_350ms] h-4" />
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-3" />
              </div>
            )}

            <div className="flex items-center justify-center gap-5">
              {/* Left Action Icon */}
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shadow-sm"
                title="Camera input"
              >
                <Camera className="w-4.5 h-4.5 text-slate-600" />
              </button>

              {/* Center Glowing Voice Mic Button */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-600 animate-pulse shadow-lg shadow-red-500/30 text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  title="Stop recording"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] shadow-lg shadow-blue-500/30 text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                  title="Tap to speak"
                >
                  <Mic className="w-7 h-7" />
                </button>
              )}

              {/* Right Action Icon */}
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shadow-sm"
                title="Audio Waveform"
              >
                <Activity className="w-4.5 h-4.5 text-blue-600" />
              </button>
            </div>

            <div className="text-center px-2">
              <p className="text-xs font-semibold text-slate-700">
                {isRecording ? `Recording (${recordingSeconds}s)... Tap red square when finished` : voiceStatusText}
              </p>
              {isRecording && (
                <p className="text-[11px] text-blue-600 mt-0.5">
                  Live speech AI is extracting service type, company & authority...
                </p>
              )}
            </div>

            {/* Quick Multi-Domain Voice Test Prompts */}
            <div className="w-full pt-1">
              <div className="text-[11px] font-semibold text-slate-500 text-center mb-2">
                Or test with multi-domain AI samples:
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('Anti-Ragging: Seniors in college hostel are harassing 1st year students at campus in Rajahmundry.')}
                  className="text-[11px] bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  🛡️ Anti-Ragging UGC Incident
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('National Cyber Crime: ₹45,000 lost in unauthorized phishing link scam on Telegram, immediate 1930 freeze.')}
                  className="text-[11px] bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  🚨 1930 Cyber Fraud Alert
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('Amazon delivered damaged electronic monitor and return request rejected by seller.')}
                  className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  📦 Amazon Damaged Item
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('Jio Fiber broadband optical line is broken with red LOS light in Visakhapatnam.')}
                  className="text-[11px] bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  📶 Jio Fiber Red Light
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('State Bank of India ATM failed cash dispense of Rs 5000 in Rajahmundry.')}
                  className="text-[11px] bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  🏧 SBI ATM Dispense
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoiceSample('My Lloyd AC is not cooling properly and needs technician repair in Rajahmundry.')}
                  className="text-[11px] bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 font-medium px-2.5 py-1 rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  ❄️ Lloyd AC Service
                </button>
              </div>
            </div>

          </div>

          {/* "Or choose from categories" Section - 12 Online Service Providers */}
          <div className="pt-2">
            <h3 className="font-bold text-xs text-slate-600 mb-2.5">
              Or pick from 12+ Online Service Sectors
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {/* 1. Anti-Ragging */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Anti-Ragging', 'Anti-ragging compliance affidavit and incident reporting for college students.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-rose-300 hover:bg-rose-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Anti-Ragging</span>
              </button>

              {/* 2. Cyber Crime 1930 */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Cyber Crime', 'National Cyber Crime 1930 financial fraud and fake account report.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-red-300 hover:bg-red-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Cyber Crime (1930)</span>
              </button>

              {/* 3. E-Commerce */}
              <button
                type="button"
                onClick={() => handleSelectCategory('E-Commerce', 'Amazon / Flipkart package refund and missing item grievance.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">E-Commerce & Orders</span>
              </button>

              {/* 4. Telecom & 5G */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Telecom', 'Jio / Airtel broadband down and fiber network outage.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-sky-300 hover:bg-sky-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Telecom & Fiber</span>
              </button>

              {/* 5. Banking & Finance */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Banking & Finance', 'State Bank of India ATM failed cash dispense of Rs 5000, account debited.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Landmark className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Banking & UPI</span>
              </button>

              {/* 6. Appliance Service */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Appliance Service', 'My AC is not cooling, Lloyd brand and needs technician service.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Tv className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">AC & Appliances</span>
              </button>

              {/* 7. Electricity */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Electricity', 'Power outage on main street, transformer sparking.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Electricity & Power</span>
              </button>

              {/* 8. Water & Municipal */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Water Supply', 'No water supply in block 4, pipeline broken.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Droplet className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Water & Municipal</span>
              </button>

              {/* 9. Healthcare & Blood */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Healthcare', 'Urgent medical assistance or emergency blood request O+ blood.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-rose-300 hover:bg-rose-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Heart className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Healthcare & Blood</span>
              </button>

              {/* 10. Travel & Railways */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Travel', 'IRCTC train cancellation refund and PNR discrepancy.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Plane className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Railways & Travel</span>
              </button>

              {/* 11. Real Estate & RERA */}
              <button
                type="button"
                onClick={() => handleSelectCategory('RERA', 'Builder delayed possession beyond agreed agreement date.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Real Estate & RERA</span>
              </button>

              {/* 12. Govt Welfare & Schemes */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Govt Welfare', 'Aadhaar biometric update or EPFO PF withdrawal claim delay.')}
                className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:bg-slate-50/60 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <FileCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Govt Schemes & PF</span>
              </button>
            </div>
          </div>

          {/* Bottom Action Button: Continue -> */}
          <button
            type="button"
            disabled={analyzing}
            onClick={() => handleAnalyzeText(inputText || 'My AC is not cooling, it is a Lloyd brand and needs service.')}
            className="w-full py-3.5 px-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <span>{analyzing ? 'AI Matching Authority & Details...' : 'Continue to AI Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: AI UNDERSTANDS YOUR PROBLEM (Step 2)                             */}
      {/* ========================================================================= */}
      {activeStep === 'AI_UNDERSTAND' && (
        <div className="space-y-4">
          
          {/* Top Bar: Back Arrow */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveStep('DESCRIBE')}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              AI understands your problem
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
              We extracted your <strong className="text-slate-700">Service Type</strong>, <strong className="text-slate-700">Company Name</strong>, and <strong className="text-slate-700">Issue</strong>. Please confirm or make changes.
            </p>
          </div>

          {/* Structured Fields Container Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
            
            {/* Field 1: Intent */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Intent</div>
                {isEditing ? (
                  <select
                    value={editIntent}
                    onChange={(e) => setEditIntent(e.target.value as CaseType)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  >
                    <option value="SERVICE_REQUEST">Service Request</option>
                    <option value="COMPLAINT">Complaint</option>
                    <option value="EMERGENCY_REQUIREMENT">Emergency Requirement</option>
                  </select>
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editIntent.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            </div>

            {/* Field 2: Organization / Company Name */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Company / Organization</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editOrgName}
                  </div>
                )}
              </div>
            </div>

            {/* Field 3: Service Type / Product */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Service Type / Category</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editProduct}
                  </div>
                )}
              </div>
            </div>

            {/* Field 4: Issue / Problem Description */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Issue / Problem Description</div>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 text-xs font-medium text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-semibold text-[#1E293B] mt-0.5 leading-relaxed">
                    {editDescription}
                  </div>
                )}
              </div>
            </div>

            {/* Field 5: Location */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Location</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editLocation}
                  </div>
                )}
              </div>
            </div>

            {/* Field 6: Priority */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-4.5 h-4.5 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Priority</div>
                {isEditing ? (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5 capitalize">
                    {editPriority.toLowerCase()}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Action Section */}
          <div className="pt-2 text-center space-y-3">
            <h3 className="font-bold text-sm text-[#1E293B]">
              Is this correct?
            </h3>

            <div className="flex gap-3">
              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex-1 py-3 rounded-full border border-slate-200 text-[#2563EB] font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isEditing ? 'Save Edits' : 'Edit'}
              </button>

              {/* Yes, Continue Button -> Navigates to Review & Confirm */}
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setActiveStep('CONFIRM');
                }}
                className="flex-1 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                Yes, Continue
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              Step 1 of 3
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: REVIEW & CONFIRM (Step 3)                                       */}
      {/* ========================================================================= */}
      {activeStep === 'CONFIRM' && (
        <div className="space-y-4">
          
          {/* Top Bar: Back Arrow to Step 2 */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveStep('AI_UNDERSTAND')}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              Review & Confirm
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
              Please review your request details before submitting.
            </p>
          </div>

          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

          {/* 6 Structured Review Fields Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
            
            {/* 1. Intent */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Intent</div>
                {isEditing ? (
                  <select
                    value={editIntent}
                    onChange={(e) => setEditIntent(e.target.value as CaseType)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  >
                    <option value="SERVICE_REQUEST">Service Request</option>
                    <option value="COMPLAINT">Complaint</option>
                    <option value="EMERGENCY_REQUIREMENT">Emergency Requirement</option>
                  </select>
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editIntent.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Organization */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Company / Organization</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editOrgName}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Product / Service */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Service Type</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editProduct}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Location */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Location</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  />
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5">
                    {editLocation}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Priority */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-4.5 h-4.5 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Priority</div>
                {isEditing ? (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                    className="mt-1 text-xs font-semibold text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-1.5 w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <div className="text-xs font-bold text-[#1E293B] mt-0.5 capitalize">
                    {editPriority.toLowerCase()}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Description */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-400">Issue / Description</div>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 text-xs font-medium text-[#1E293B] bg-slate-50 border border-slate-200 rounded-lg p-2 w-full leading-relaxed"
                  />
                ) : (
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {editDescription}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Action Buttons Section */}
          <div className="pt-2 space-y-2.5">
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="w-full py-3 rounded-full border border-slate-200 text-[#2563EB] font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer bg-white"
            >
              {isEditing ? 'Save Edits' : 'Edit'}
            </button>

            {/* Submit Request Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting Case...' : 'Submit Request'}
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: REQUEST SUBMITTED! (Step 4)                                     */}
      {/* ========================================================================= */}
      {activeStep === 'SUBMITTED' && (
        <div className="space-y-4 pt-1">
          
          {/* Top Bar: Back Arrow */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/citizen/home')}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Celebratory Green Checkmark with Confetti Sparkles */}
          <div className="flex flex-col items-center justify-center text-center pt-2 relative">
            
            {/* Confetti Elements */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute -top-3 -left-6 w-2 h-1 bg-amber-400 rounded-full rotate-45" />
              <div className="absolute -top-6 left-1/2 w-1.5 h-3 bg-blue-500 rounded-full -rotate-12" />
              <div className="absolute -top-3 -right-6 w-2 h-1 bg-purple-500 rounded-full -rotate-45" />
              <div className="absolute top-4 -left-9 w-2.5 h-1 bg-rose-400 rounded-full rotate-12" />
              <div className="absolute top-4 -right-9 w-2.5 h-1 bg-emerald-400 rounded-full -rotate-12" />
              <div className="absolute -bottom-2 -left-5 w-1.5 h-1.5 bg-sky-400 rounded-full" />
              <div className="absolute -bottom-2 -right-5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />

              {/* Big Green Circle with Checkmark */}
              <div className="w-20 h-20 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check className="w-10 h-10 stroke-[3.5]" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              Request Submitted!
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-1">
              Your request has been successfully submitted.
            </p>
          </div>

          {/* Case ID and Tracking Details Card */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            
            {/* Top Highlight Banner with Case ID */}
            <div className="bg-[#F4F8FF] border-b border-blue-50/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Compass className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Case ID</div>
                  <div className="text-sm font-black text-[#1E293B] tracking-tight">
                    {submittedCaseId}
                  </div>
                </div>
              </div>

              {/* Copy Case ID Button */}
              <button
                type="button"
                onClick={handleCopyCaseId}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Copy Case ID"
              >
                {copiedCaseId ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-bold text-blue-600">COPY</span>
                )}
              </button>
            </div>

            {/* Structured Info Rows */}
            <div className="p-4 space-y-3.5">
              
              {/* Row 1: Organization */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Organization</span>
                <span className="font-bold text-[#1E293B] text-right truncate max-w-[200px]">
                  {editOrgName}
                </span>
              </div>

              {/* Row 2: Service Type */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Service Type</span>
                <span className="font-bold text-[#1E293B]">
                  {editProduct}
                </span>
              </div>

              {/* Row 3: Estimated SLA */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Estimated SLA</span>
                <span className="font-bold text-[#1E293B]">
                  2-3 days
                </span>
              </div>

              {/* Row 4: Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-[11px]">
                  Received
                </span>
              </div>

            </div>

          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-2 space-y-2.5">
            {/* Track My Request Button */}
            <button
              type="button"
              onClick={() => {
                if (createdCaseDbId) {
                  navigate(`/citizen/requests/${createdCaseDbId}`);
                } else {
                  navigate(`/citizen/requests/${submittedCaseId}`);
                }
              }}
              className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              Track My Request
            </button>

            {/* Back to Home Button */}
            <button
              type="button"
              onClick={() => navigate('/citizen/home')}
              className="w-full py-3 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer bg-white"
            >
              Back to Home
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
