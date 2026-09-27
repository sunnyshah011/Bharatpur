import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Send,
  Sparkles,
  MapPin,
  Compass,
  CalendarDays,
  RotateCcw,
  User,
  Loader2,
} from "lucide-react";

import { useAuth } from "@clerk/react";

import { sendAIChat } from "../lib/api";


const suggestedQuestions = [
  {
    icon: MapPin,
    title: "Places to visit",
    question:
      "What are the best places to visit around Bharatpur?",
  },
  {
    icon: Compass,
    title: "Tell me about Sauraha",
    question:
      "Tell me about Sauraha.",
  },
  {
    icon: CalendarDays,
    title: "Plan a trip",
    question:
      "Suggest a 2-day trip around Bharatpur.",
  },
  {
    icon: MapPin,
    title: "Maula Kalika Temple",
    question:
      "Tell me about Maula Kalika Temple.",
  },
];


const Aiguides = () => {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Namaste! 👋 I’m Bharatpur AI, your tourism assistant.\n\nI can help you discover places, activities, culture, food, attractions, and trip ideas around Bharatpur and Chitwan.\n\nWhat would you like to explore?",
    },
  ]);

  const [input, setInput] = useState("");

  const [loading, setLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const textareaRef =
    useRef(null);


  /*
  ========================================
  AUTO SCROLL
  ========================================
  */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  /*
  ========================================
  FORMAT AI TEXT
  ========================================
  */

  const renderMessage = (text) => {
    const lines =
      String(text || "").split("\n");

    return lines.map(
      (line, index) => {
        const parts =
          line.split(
            /(\*\*.*?\*\*)/g
          );

        return (
          <div
            key={index}
            className={
              line === ""
                ? "h-3"
                : undefined
            }
          >
            {parts.map(
              (part, partIndex) => {
                if (
                  part.startsWith("**") &&
                  part.endsWith("**")
                ) {
                  return (
                    <strong
                      key={partIndex}
                      className="font-semibold"
                    >
                      {part.slice(
                        2,
                        -2
                      )}
                    </strong>
                  );
                }

                return (
                  <span
                    key={partIndex}
                  >
                    {part}
                  </span>
                );
              }
            )}
          </div>
        );
      }
    );
  };


  /*
  ========================================
  SEND MESSAGE
  ========================================
  */

  const handleSend = async (
    customMessage = null
  ) => {
    const message =
      (
        customMessage ??
        input
      ).trim();

    if (
      !message ||
      loading
    ) {
      return;
    }

    const userMessage = {
      id:
        `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    /*
    Save the history BEFORE adding
    the new user message.
    */

    const previousHistory =
      messages
        .filter(
          (item) =>
            item.role ===
            "user" ||
            item.role ===
            "assistant"
        )
        .map((item) => ({
          role:
            item.role,
          content:
            item.content,
        }));

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");

    setLoading(true);

    try {
      let token = null;

      try {
        token =
          await getToken();
      } catch {
        token = null;
      }

      const response =
        await sendAIChat(
          message,
          previousHistory,
          token
        );

      const answer =
        response?.answer ||
        response?.message ||
        "Sorry, I couldn't generate a response.";

      const assistantMessage = {
        id:
          `assistant-${Date.now()}`,
        role: "assistant",
        content: answer,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(
        "AI chatbot error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id:
            `error-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I couldn't connect to Bharatpur AI right now. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };


  /*
  ========================================
  ENTER KEY
  ========================================
  */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSend();
    }
  };


  /*
  ========================================
  NEW CHAT
  ========================================
  */

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content:
          "Namaste! 👋 I’m Bharatpur AI, your tourism assistant.\n\nAsk me anything about Bharatpur, Chitwan, places to visit, activities, culture, food, or trip planning.",
      },
    ]);

    setInput("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };


  /*
  ========================================
  SUGGESTED QUESTION
  ========================================
  */

  const handleSuggestion = (
    question
  ) => {
    handleSend(question);
  };


  return (
    <div className="min-h-[calc(100vh-72px)] bg-gradient-to-b from-slate-50 via-white to-emerald-50/40">

      {/* ========================================
          HEADER
      ======================================== */}

      <section className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Sparkles
                  size={24}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Bharatpur AI
                </h1>

                <p className="text-sm text-slate-500">
                  Your intelligent tourism assistant
                </p>
              </div>

            </div>


            <button
              type="button"
              onClick={
                handleNewChat
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <RotateCcw
                size={16}
              />

              <span className="hidden sm:inline">
                New Chat
              </span>
            </button>

          </div>

        </div>
      </section>


      {/* ========================================
          CHAT AREA
      ======================================== */}

      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8">

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

          {/* Chat header */}

          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4 sm:px-6">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Bot size={21} />
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                AI Tourism Guide
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Bharatpur tourism assistant
              </div>
            </div>

          </div>


          {/* Messages */}

          <div className="h-[55vh] min-h-[420px] overflow-y-auto bg-white px-3 py-5 sm:px-6 sm:py-7">

            {messages.map(
              (message) => {
                const isUser =
                  message.role ===
                  "user";

                return (
                  <div
                    key={
                      message.id
                    }
                    className={`mb-5 flex items-start gap-3 ${isUser
                        ? "justify-end"
                        : "justify-start"
                      }`}
                  >

                    {!isUser && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Bot
                          size={18}
                        />
                      </div>
                    )}


                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[75%] ${isUser
                          ? "rounded-br-md bg-emerald-600 text-white"
                          : message.isError
                            ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                            : "rounded-bl-md bg-slate-100 text-slate-700"
                        }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <div>
                          {renderMessage(
                            message.content
                          )}
                        </div>
                      )}
                    </div>


                    {isUser && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <User
                          size={17}
                        />
                      </div>
                    )}

                  </div>
                );
              }
            )}


            {/* ========================================
                LOADING
            ======================================== */}

            {loading && (
              <div className="mb-5 flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Bot
                    size={18}
                  />
                </div>

                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">

                    <Loader2
                      size={16}
                      className="animate-spin text-emerald-600"
                    />

                    <span>
                      Bharatpur AI is thinking...
                    </span>

                  </div>
                </div>

              </div>
            )}


            <div
              ref={
                messagesEndRef
              }
            />

          </div>


          {/* ========================================
              SUGGESTIONS
          ======================================== */}

          {messages.length <=
            1 &&
            !loading && (
              <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-5 sm:px-6">

                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Try asking
                </p>

                <div className="grid gap-2 sm:grid-cols-2">

                  {suggestedQuestions.map(
                    (
                      item
                    ) => {
                      const Icon =
                        item.icon;

                      return (
                        <button
                          key={
                            item.title
                          }
                          type="button"
                          onClick={() =>
                            handleSuggestion(
                              item.question
                            )
                          }
                          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                        >

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                            <Icon
                              size={17}
                            />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {item.title}
                            </p>

                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {
                                item.question
                              }
                            </p>
                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}


          {/* ========================================
              INPUT
          ======================================== */}

          <div className="border-t border-slate-200 bg-white p-3 sm:p-4">

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10">

              <textarea
                ref={
                  textareaRef
                }
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                disabled={loading}
                rows={1}
                placeholder="Ask anything about Bharatpur..."
                className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  handleSend()
                }
                disabled={
                  loading ||
                  !input.trim()
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                ) : (
                  <Send
                    size={19}
                  />
                )}
              </button>

            </div>

            <p className="mt-2 px-1 text-center text-[11px] text-slate-400">
              Bharatpur AI can help with
              tourism information, destinations,
              activities and trip ideas.
            </p>

          </div>

        </div>

      </main>

    </div>
  );
};


export default Aiguides;