"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = Omit<ButtonProps, "type" | "isLoading" | "loadingText"> & {
  pendingText?: string;
};

export function FormSubmitButton({ children, pendingText = "Menyimpan…", disabled, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled || pending}
      isLoading={pending}
      loadingText={pendingText}
    >
      {children}
    </Button>
  );
}
