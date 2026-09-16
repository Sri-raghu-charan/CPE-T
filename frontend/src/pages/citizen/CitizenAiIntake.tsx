import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Alert,
} from '../../design-system/index.js';
import {
  Sparkles,
  Mic,
  Square,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  FileText,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { AiExtractedCase, AiIntakeContext, Clarification } from '../../types/ai.js';
import { CaseType, CasePriority } from '../../types/case.js';

export const CitizenAiIntake: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const initialQuery = searchParams.get('q') || '';

  // Conversation state
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Language preference
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'en' | 'hi' | 'te'>('auto');

  // AI draft extraction
  const [extractedDraft, setExtractedDraft] = useState<AiExtractedCase | null>(null);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [pendingClarification, setPendingClarification] = useState<Clarification | null>(null);

  // Editable fields in review card
  const [editIntent, setEditIntent] = useState<CaseType>('SERVICE_REQUEST');
  const [editProduct, setEditProduct] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState<CasePriority>('MEDIUM');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editStructuredData, setEditStructuredData] = useState<Record<string, any>>({});
  const [editSummary, setEditSummary] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, analyzing]);

  // Sync draft into editable fields whenever draft updates
  useEffect(() => {
    if (extractedDraft) {
      setEditIntent(extractedDraft.intent);
      setEditProduct(extractedDraft.productService || '');
      setEditCategory(extractedDraft.category || '');
      setEditPriority(extractedDraft.priority || 'MEDIUM');
      setEditCity(extractedDraft.location.city || '');
      setEditAddress(extractedDraft.location.address || '');
      setEditPincode(extractedDraft.location.pincode || '');
      setEditStructuredData(extractedDraft.structuredData || {});
      setEditSummary(extractedDraft.summary || '');
      setPendingClarification(extractedDraft.nextClarification);
    }
  }, [extractedDraft]);

  // Handle initial query if provided in URL (e.g. from Home search bar)
  useEffect(() => {
    if (initialQuery.trim() && conversation.length === 0) {
      handleSend(initialQuery.trim());
    }
  }, [initialQuery]);

  /**
   * Main conversational intake send handler
   */
  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || analyzing) return;

    setErrorMessage(null);
    setAnalyzing(true);

    const userMessage = textToSend.trim();
    setInputText('');

    // Optimistically update conversation history
    const updatedHistory = [...conversation, { role: 'user' as const, text: userMessage }];
    setConversation(updatedHistory);

    // Build context payload for multi-turn accumulation
    const contextPayload: AiIntakeContext = {
      intent: extractedDraft?.intent,
      organizationId: extractedDraft?.organization.matchedId,
      organizationName: extractedDraft?.organization.matchedName,
      productService: editProduct || extractedDraft?.productService,
      category: editCategory || extractedDraft?.category,
      priority: editPriority || extractedDraft?.priority,
      location: {
        city: editCity || extractedDraft?.location.city,
        address: editAddress || extractedDraft?.location.address,
        pincode: editPincode || extractedDraft?.location.pincode,
      },
      structuredData: {
        ...(extractedDraft?.structuredData || {}),
        ...editStructuredData,
      },
      conversationHistory: updatedHistory,
    };

    try {
      const res = await fetch('/api/v1/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          languageHint: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
          context: contextPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to analyze request with AI.');
      }

      const extracted: AiExtractedCase = json.data;
      setExtractedDraft(extracted);
      setConversation(extracted.conversationHistory);
      setPendingClarification(extracted.nextClarification);
    } catch (err: any) {
      console.error('AI Intake analysis error:', err);
      setErrorMessage(err.message || 'Could not process request. Please try again or use the manual form.');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Handle quick clarification chip click
   */
  const handleClarificationChoice = (option: string) => {
    handleSend(option);
  };

  /**
   * Voice Dictation - Start recording using MediaRecorder
   */
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await processVoiceAudio(base64Data, 'audio/webm');
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access unavailable or denied:', err);
      setErrorMessage('Microphone access was denied or not supported in this browser. Please type your request.');
    }
  };

  /**
   * Voice Dictation - Stop recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  /**
   * Send Voice Base64 to backend speech adapter
   */
  const processVoiceAudio = async (audioBase64: string, mimeType: string) => {
    setAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/ai/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
          context: extractedDraft
            ? {
                intent: extractedDraft.intent,
                organizationId: extractedDraft.organization.matchedId,
                productService: editProduct || extractedDraft.productService,
                category: editCategory || extractedDraft.category,
                conversationHistory: conversation,
              }
            : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to process voice audio.');
      }

      const extracted: AiExtractedCase = json.data;
      setExtractedDraft(extracted);
      setConversation(extracted.conversationHistory);
      setPendingClarification(extracted.nextClarification);
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setErrorMessage(err.message || 'Speech processing failed. Please type your request.');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Final Confirmation: Creates official database record through Universal Case Engine
   */
  const handleConfirmAndCreate = async () => {
    if (!extractedDraft) return;

    if (!extractedDraft.organization.matchedId) {
      setErrorMessage('Organization could not be determined. Please specify the brand or provider.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    // Prepare clean case creation payload
    const casePayload = {
      type: editIntent,
      title: editSummary || `${editIntent.replace(/_/g, ' ')}: ${editProduct}`,
      description: conversation.map((c) => `${c.role === 'user' ? 'Citizen' : 'CPET'}: ${c.text}`).join('\n\n'),
      category: editCategory || 'General Assistance',
      productService: editProduct || undefined,
      organizationId: extractedDraft.organization.matchedId,
      priority: editPriority,
      structuredData: editStructuredData,
      location: editCity || editAddress || editPincode ? {
        city: editCity || undefined,
        address: editAddress || undefined,
        pincode: editPincode || undefined,
      } : undefined,
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
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create official case.');
      }

      setSuccessMessage('Case created successfully! Redirecting to tracking view...');
      setTimeout(() => {
        navigate(`/citizen/requests/${json.data._id}`);
      }, 750);
    } catch (err: any) {
      console.error('Case creation error:', err);
      setErrorMessage(err.message || 'Failed to confirm case.');
      setSubmitting(false);
    }
  };

  const samplePrompts = [
    'I have a Lloyd AC and it needs servicing.',
    'Urgent: need 2 units of O- blood immediately at City Trauma Hospital.',
    'Streetlights on 5th cross road Ward 12 are not working.',
    'Overcharged on electric meter bill by 40%.',
    'मेरा लॉयड एसी ठंडा नहीं कर रहा है और सर्विसिंग चाहिए',
    'రక్తం అత్యవసరం O+ గ్రూప్ 2 యూనిట్లు కావాలి',
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            to="/citizen/home"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Citizen Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Tell CPET What You Need
                <Badge variant="progress" size="sm">AI-First Intake</Badge>
              </h1>
              <p className="text-xs text-slate-500">
                Explain your problem or emergency naturally. CPET asks only what is missing.
              </p>
            </div>
          </div>
        </div>

        {/* Language Selector & Manual Form Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setSelectedLanguage('auto')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'auto' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setSelectedLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLanguage('hi')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'hi' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setSelectedLanguage('te')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'te' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              తెలుగు
            </button>
          </div>
          <Link to="/citizen/requests/new">
            <Button variant="outline" size="sm">
              Manual Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <Alert variant="error" title="Intake Error">
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {/* Main Grid: Conversation on Left, Structured Review Draft on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversational Stream & Input (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Intake Dialogue</span>
                  {extractedDraft?.detectedLanguage && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      Lang: {extractedDraft.detectedLanguage}
                    </span>
                  )}
                </CardTitle>
                {conversation.length > 0 && (
                  <button
                    onClick={() => {
                      setConversation([]);
                      setExtractedDraft(null);
                      setPendingClarification(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {/* Empty state: sample prompt chips */}
              {conversation.length === 0 && (
                <div className="py-6 px-2 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">What would you like to raise or escalate today?</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Type your situation in your own words, or tap any example below to see how CPET extracts structured requests:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(p)}
                        className="text-xs text-left bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                      >
                        "{p}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Bubble Stream */}
              {conversation.length > 0 && (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {conversation.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                        }`}
                      >
                        <div className="text-[10px] font-medium tracking-wide uppercase opacity-75 mb-1">
                          {msg.role === 'user' ? 'You' : 'CPET Assistant'}
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {analyzing && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 italic py-2">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                      <span>CPET AI is analyzing request and matching organization...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Clarification prompt with quick options */}
              {pendingClarification && !analyzing && (
                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Clarification Needed:</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {pendingClarification.question}
                  </p>
                  {pendingClarification.options && pendingClarification.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pendingClarification.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleClarificationChoice(opt)}
                          className="text-xs bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium px-2.5 py-1 rounded-md shadow-xs transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Input bar: Text input + Voice record button + Send */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                {isRecording ? (
                  <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                      <span className="text-xs font-semibold text-rose-800">
                        Listening ({recordingSeconds}s)... Speak clearly.
                      </span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={stopRecording}
                      leftIcon={<Square className="w-3.5 h-3.5" />}
                    >
                      Stop & Transcribe
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend(inputText);
                    }}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={startRecording}
                      title="Dictate with voice"
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <Mic className="w-4 h-4 text-slate-700" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        pendingClarification
                          ? `Answer: ${pendingClarification.question.slice(0, 45)}...`
                          : 'Describe your request, issue, or location...'
                      }
                      disabled={analyzing}
                      className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!inputText.trim() || analyzing}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Send
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structured Case Review Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>What CPET Understood</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Structured draft prepared by AI. You can review and adjust any field.
                  </CardDescription>
                </div>
                {extractedDraft && (
                  <Badge variant={extractedDraft.isComplete ? 'resolved' : 'pending'} size="sm">
                    {extractedDraft.isComplete ? 'Ready to Submit' : 'Intake In-Progress'}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {!extractedDraft ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <SlidersHorizontal className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">
                    As you explain your problem, structured fields (intent, brand, model, location) will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  {/* Intent & Priority Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Case Type / Intent
                      </label>
                      <select
                        value={editIntent}
                        onChange={(e) => setEditIntent(e.target.value as CaseType)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 font-medium text-slate-800"
                      >
                        <option value="SERVICE_REQUEST">Service Request</option>
                        <option value="COMPLAINT">Complaint</option>
                        <option value="GRIEVANCE">Civic Grievance</option>
                        <option value="BLOOD_REQUEST">Blood Requirement</option>
                        <option value="SUPPORT_REQUEST">Support Request</option>
                        <option value="FEEDBACK">Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Urgency / Priority
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 font-medium text-slate-800"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent / Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Matched Organization */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Matched Provider</span>
                      {extractedDraft.organization.rawMention && (
                        <span className="text-[10px] text-slate-500">
                          Mentioned: "{extractedDraft.organization.rawMention}"
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>{extractedDraft.organization.matchedName || 'Searching provider...'}</span>
                    </div>
                  </div>

                  {/* Product / Service */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Product / Equipment
                    </label>
                    <Input
                      value={editProduct}
                      onChange={(e) => setEditProduct(e.target.value)}
                      placeholder="e.g. Split Air Conditioner"
                    />
                  </div>

                  {/* Structured Specifics (Blood Group, Issue Type, etc) */}
                  {editIntent === 'BLOOD_REQUEST' && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                      <div>
                        <label className="block text-[10px] font-semibold text-rose-900 uppercase">
                          Blood Group
                        </label>
                        <input
                          type="text"
                          value={editStructuredData.bloodGroup || 'O+'}
                          onChange={(e) =>
                            setEditStructuredData({ ...editStructuredData, bloodGroup: e.target.value })
                          }
                          className="w-full text-xs font-bold text-rose-950 bg-white border border-rose-300 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-rose-900 uppercase">
                          Units Needed
                        </label>
                        <input
                          type="number"
                          value={editStructuredData.unitsNeeded || 1}
                          onChange={(e) =>
                            setEditStructuredData({
                              ...editStructuredData,
                              unitsNeeded: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="w-full text-xs font-bold text-rose-950 bg-white border border-rose-300 rounded px-2 py-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-rose-900 uppercase">
                          Hospital / Center
                        </label>
                        <input
                          type="text"
                          value={editStructuredData.hospitalName || ''}
                          onChange={(e) =>
                            setEditStructuredData({ ...editStructuredData, hospitalName: e.target.value })
                          }
                          placeholder="e.g. City Trauma Hospital"
                          className="w-full text-xs text-rose-950 bg-white border border-rose-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  )}

                  {editIntent === 'SERVICE_REQUEST' && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500">
                          Identified Issue / Requirement
                        </label>
                        <input
                          type="text"
                          value={editStructuredData.issueType || ''}
                          onChange={(e) =>
                            setEditStructuredData({ ...editStructuredData, issueType: e.target.value })
                          }
                          placeholder="e.g. Periodic Maintenance Service"
                          className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500">
                          Appliance Serial Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={editStructuredData.serialNumber || ''}
                          onChange={(e) =>
                            setEditStructuredData({ ...editStructuredData, serialNumber: e.target.value })
                          }
                          placeholder="e.g. SN-8821940"
                          className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Location Details */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Service Location</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                      />
                      <Input
                        placeholder="Pincode"
                        value={editPincode}
                        onChange={(e) => setEditPincode(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Street address / Landmark"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>

                  {/* Final Review & Submit Action */}
                  <div className="pt-3 border-t border-slate-200">
                    <Button
                      variant={editIntent === 'BLOOD_REQUEST' ? 'danger' : 'primary'}
                      size="md"
                      className="w-full justify-center"
                      onClick={handleConfirmAndCreate}
                      disabled={submitting}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      {submitting
                        ? 'Creating Case...'
                        : editIntent === 'BLOOD_REQUEST'
                        ? 'Confirm & Broadcast Emergency Blood Case'
                        : 'Confirm & Create Official Request'}
                    </Button>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                      Review carefully. Submission logs an immutable audit event in CPET.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default CitizenAiIntake;
