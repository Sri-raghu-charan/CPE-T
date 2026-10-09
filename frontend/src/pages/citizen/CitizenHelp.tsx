import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  Building2,
  Send,
  CheckCircle2,
  HelpCircle,
  LifeBuoy,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'general' | 'antiragging' | 'cybercrime' | 'ecommerce' | 'banking' | 'appliances' | 'utilities' | 'blood' | 'sla';
  question: string;
  answer: string;
}

const FAQS_DATA: FaqItem[] = [
  {
    id: 'f-anti1',
    category: 'antiragging',
    question: 'How does CPET handle Anti-Ragging complaints and student compliance affidavits?',
    answer:
      'CPET provides a direct, confidential bridge to the UGC Anti-Ragging National Monitoring Cell and AICTE Student Grievance Portals. Students can file anonymous incident reports or generate mandatory student/parent anti-ragging affidavits. Severe complaints are flagged as URGENT and forwarded directly to the university ombudsman and regional police authorities within 2 hours.',
  },
  {
    id: 'f-cyber1',
    category: 'cybercrime',
    question: 'What should I do immediately if I am a victim of an online financial scam or cyber fraud?',
    answer:
      'Immediately dial the National Cyber Crime Reporting Bureau Helpline 1930 or file an emergency ticket on CPET under the "Cyber Crime" domain. The first 2 hours ("Golden Hours") allow cyber cells and banks to freeze suspect UPI/account nodes before money is laundered.',
  },
  {
    id: 'f-ecom1',
    category: 'ecommerce',
    question: 'How does CPET assist with Amazon, Flipkart, Swiggy, or Quick Commerce disputes?',
    answer:
      'When sellers or delivery platforms reject valid returns for damaged, fake, or missing products, CPET routes your dispute to brand escalation nodal desks under Consumer Protection (E-Commerce) Rules 2020 with a legally enforceable 48-hour resolution SLA.',
  },
  {
    id: 'f-bank1',
    category: 'banking',
    question: 'What happens if an ATM fails to dispense cash or UPI transaction gets stuck?',
    answer:
      'Under Reserve Bank of India (RBI) mandates, failed ATM dispense transactions must be auto-credited back within T+5 working days. Filing via CPET sends your UTR and ATM EJ log request directly to the bank’s Principal Nodal Officer.',
  },
  {
    id: 'f1',
    category: 'general',
    question: 'How does CPET resolve consumer complaints across companies, authorities and public utilities?',
    answer:
      'CPET provides an integrated multi-tenant escalation gateway connecting citizens directly with verified brand service centers (Lloyd, Samsung, LG, Voltas, etc.), authorities (UGC Anti-Ragging, Cyber Crime, RERA, UIDAI), and public utility providers (APDCL, Water Board, PWD). Each case is assigned an official SLA timeline with live case officer chat and automated escalation if deadlines are missed.',
  },
  {
    id: 'f2',
    category: 'general',
    question: 'How does the AI Assistant record voice and extract service details?',
    answer:
      'When you tap the microphone in AI Assistant, the speech engine transcribes your voice in real time and automatically parses the Company Name (e.g. UGC Anti-Ragging, Amazon, Lloyd, APDCL), Service Type, and Issue Description into structured case fields for 1-tap submission.',
  },
  {
    id: 'f3',
    category: 'sla',
    question: 'What is the SLA Countdown and what happens if an organization misses it?',
    answer:
      'Every case is governed by an automated Service Level Agreement (e.g. 2 hours for Anti-Ragging/Cyber emergencies, 24 hours for power cuts, 2-3 days for appliance repair). The live SLA Countdown shows remaining time. If an organization breaches SLA, the case is automatically escalated with High Priority to CPET Regional Grievance Officers and regulatory oversight authorities.',
  },
  {
    id: 'f4',
    category: 'appliances',
    question: 'How are warranty claims and technician visits scheduled for AC and appliances?',
    answer:
      'When you submit an appliance request, the nearest authorized service center is assigned. You can upload invoice receipts or photos in attachments. The assigned technician contacts you via phone or in-app chat to confirm the home visit appointment.',
  },
  {
    id: 'f5',
    category: 'utilities',
    question: 'How are electricity (APDCL) and water pipeline grievances handled?',
    answer:
      'Utility complaints are routed directly to local division substations or municipal water boards. Emergency cases (transformer sparks, pipe ruptures) receive immediate dispatch priority, and emergency field teams are deployed with live timeline tracking.',
  },
  {
    id: 'f6',
    category: 'blood',
    question: 'How does the Blood Hub emergency donor matching work?',
    answer:
      'In medical emergencies, citizens or hospitals broadcast blood requirements specifying blood group, units, and hospital. Registered voluntary donors in that city receive urgent push/SMS alerts to contact the family and donate immediately.',
  },
  {
    id: 'f7',
    category: 'sla',
    question: 'Can I live chat or call the assigned service center directly?',
    answer:
      'Yes! In the Case Details view, tap "Call" to initiate telephone contact with the service desk, or tap "Chat" to exchange real-time messages and status updates with the assigned support agent.',
  },
  {
    id: 'f8',
    category: 'general',
    question: 'What documents or photos should I attach with my request?',
    answer:
      'We recommend attaching photos of the damaged product or defect, college ID or affidavit docs, utility meter readings, or purchase invoices (PDF/JPEG up to 10MB) to speed up inspection and approval.',
  },
];

export const CitizenHelp: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'antiragging' | 'cybercrime' | 'ecommerce' | 'banking' | 'general' | 'appliances' | 'utilities' | 'blood' | 'sla'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('f-anti1');

  // Contact Form State
  const [contactName, setContactName] = useState('Varsha S');
  const [contactEmail, setContactEmail] = useState('varsha@gmail.com');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const filteredFaqs = FAQS_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    setIsSubmittingMessage(true);
    setTimeout(() => {
      setIsSubmittingMessage(false);
      setSentSuccess(true);
      setContactSubject('');
      setContactMessage('');
      setTimeout(() => setSentSuccess(false), 4000);
    }, 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      
      {/* 1. Header: Back Arrow + Title */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
            Help & FAQs
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            Find answers, emergency hotlines and 24/7 citizen support
          </p>
        </div>
      </div>

      {/* 2. Search Input Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm flex items-center gap-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="w-4.5 h-4.5 text-slate-400 ml-1.5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions (e.g. Anti-Ragging, 1930 Cyber, Amazon, SLA, AC service)..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold mr-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Topics
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('antiragging')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'antiragging'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🛡️ Anti-Ragging
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('cybercrime')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'cybercrime'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🚨 Cyber Crime 1930
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('ecommerce')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'ecommerce'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📦 E-Commerce
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('banking')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'banking'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🏧 Banking & UPI
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('general')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'general'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          General & AI
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('appliances')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'appliances'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Appliance Service
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('utilities')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'utilities'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Utilities & Power
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('blood')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'blood'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Blood Hub
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('sla')}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'sla'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          SLA & Tracking
        </button>
      </div>

      {/* 4. FAQs Accordion List */}
      <div className="space-y-2.5">
        <h2 className="font-bold text-xs text-slate-600 uppercase tracking-wider px-1">
          Frequently Asked Questions ({filteredFaqs.length})
        </h2>

        {filteredFaqs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No questions found matching your search</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try different keywords or contact our 24/7 helpline below.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#1E293B] leading-snug">
                      {faq.question}
                    </span>
                    <div className="text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 font-normal leading-relaxed border-t border-slate-50 bg-[#FAFCFF]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 24/7 Official Contact Channels Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <LifeBuoy className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1E293B]">Direct Helplines & Emergency Numbers</h3>
            <p className="text-[10px] text-slate-400 font-normal">Official national and regional escalation desks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Channel 1: UGC Anti-Ragging Toll-Free */}
          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">UGC Anti-Ragging 24/7 National Hotline</div>
                <div className="text-xs font-black text-rose-700">1800-180-5522 (Toll-Free)</div>
              </div>
            </div>
            <a
              href="tel:18001805522"
              className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 shadow-xs"
            >
              Call
            </a>
          </div>

          {/* Channel 2: Cyber Crime 1930 */}
          <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">Cyber Crime & Financial Fraud Hotline</div>
                <div className="text-xs font-black text-red-700">1930 (Golden Hour Freeze)</div>
              </div>
            </div>
            <a
              href="tel:1930"
              className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shrink-0 shadow-xs"
            >
              Call
            </a>
          </div>

          {/* Channel 3: Toll Free Phone CPET */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">24/7 CPET Consumer Escalation</div>
                <div className="text-xs font-black text-blue-700">1800-425-CPET (2738)</div>
              </div>
            </div>
            <a
              href="tel:18004252738"
              className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 shadow-xs"
            >
              Call
            </a>
          </div>

          {/* Channel 4: WhatsApp Chat */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">Live WhatsApp Redressal & SOS</div>
                <div className="text-xs font-black text-emerald-700">+91 94940 12345</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => alert('Opening WhatsApp chat with CPET Redressal Desk...')}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 shadow-xs cursor-pointer"
            >
              Chat
            </button>
          </div>
        </div>

        {/* Office Address Info */}
        <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px] text-slate-600 border border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Central Consumer Secretariat & Regional Centers</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            • <strong>Vijayawada Head Office:</strong> 3rd Floor, AP Technology Bhavan, MG Road, Vijayawada - 520010<br />
            • <strong>Rajahmundry Regional Cell:</strong> Main Road, Danavaipeta, Rajahmundry, East Godavari, AP - 533103
          </p>
        </div>
      </div>

      {/* 6. Send a Message to Support Form */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1E293B]">Send Us an Inquiry</h3>
            <p className="text-[10px] text-slate-400 font-normal">Our officer will respond within 2 hours</p>
          </div>
        </div>

        {sentSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Inquiry received! Case Officer will reply to your registered email/phone shortly.</span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-[#FAFCFF] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Email / Phone
              </label>
              <input
                type="text"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-[#FAFCFF] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Subject / Topic
            </label>
            <input
              type="text"
              required
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="e.g., Delay in AC service or Electricity meter bill inquiry"
              className="w-full bg-[#FAFCFF] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Message Details
            </label>
            <textarea
              rows={3}
              required
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Describe your question or issue in detail..."
              className="w-full bg-[#FAFCFF] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingMessage || !contactMessage.trim()}
            className="w-full py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{isSubmittingMessage ? 'Sending Inquiry...' : 'Submit Support Inquiry'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};
