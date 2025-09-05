import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { WhatsAppChat } from "./components/WhatsAppChat";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ChatWindowRoute } from "./components/ChatWindow";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Router>
        <Authenticated>
          <Routes>
            <Route path="/" element={<WhatsAppChat />} />
            <Route path="/chat/:id" element={<ChatWindowRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Authenticated>
      </Router>

      <Unauthenticated>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
            <h2 className="text-xl font-semibold text-green-600">
              AdamChat
            </h2>
          </header>
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-green-600 mb-4">
                  Welcome
                </h1>
                <p className="text-xl text-gray-600">
                  Sign in to start messaging
                </p>
              </div>
              <SignInForm />
            </div>
          </main>
        </div>
      </Unauthenticated>

      <Toaster />
    </div>
  );
}
