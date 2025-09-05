"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          try {
            await signIn("mock-phone", formData);
            // setTimeout(async () => {}, 3000);
          } catch (e) {
            let toastTitle = e.message;
            toast.error(toastTitle);
            setSubmitting(false);
          }
        }}
      >
        <input
          className="auth-input-field"
          type="text"
          name="phone"
          placeholder="Phone"
          required
        />
        {/* <input name="code" value={"000000"} type="hidden" /> */}

        <button className="auth-button" type="submit" disabled={submitting}>
          Sign in
        </button>
      </form>
    </div>
  );
}
