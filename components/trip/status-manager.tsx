"use client";

import { useState } from "react";
import { TripStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StatusBadge, getStatusTransitionInfo } from "./status-badge";
import { Loader2, ChevronDown, Clock, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface StatusManagerProps {
  tripId: string;
  currentStatus: TripStatus;
  onStatusChange?: (newStatus: TripStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

interface StatusChangeConfirmation {
  show: boolean;
  newStatus: TripStatus | null;
  title: string;
  description: string;
  variant: "default" | "destructive";
}

export function StatusManager({
  tripId,
  currentStatus,
  onStatusChange,
  disabled = false,
  showLabel = true,
  className,
}: StatusManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<StatusChangeConfirmation>({
    show: false,
    newStatus: null,
    title: "",
    description: "",
    variant: "default",
  });
  const [success, setSuccess] = useState(false);

  const transitions = getStatusTransitionInfo(currentStatus);

  const handleStatusChange = async (
    newStatus: TripStatus,
    skipConfirmation = false
  ) => {
    if (!skipConfirmation) {
      const transition = transitions.find((t) => t.status === newStatus);
      if (!transition) return;

      setConfirmation({
        show: true,
        newStatus,
        title: `Mark as ${transition.label}?`,
        description: `Are you sure you want to change the trip status to ${transition.status.toLowerCase()}? ${
          transition.description
        }`,
        variant:
          "variant" in transition ? (transition as any).variant : "default",
      });
      setSuccess(false);
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.updateTripStatus(tripId, newStatus);

      // Show success toast
      const transition = transitions.find((t) => t.status === newStatus);
      toast.success(`Trip status changed to ${newStatus.toLowerCase()}`);

      // Notify parent component
      onStatusChange?.(newStatus);

      // Show success state in dialog
      setSuccess(true);
      setTimeout(() => {
        setConfirmation((prev) => ({ ...prev, show: false }));
        setSuccess(false);
      }, 500); // 500ms delay for smooth UX
    } catch (error) {
      console.error("Failed to update trip status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update trip status. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (transitions.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={currentStatus} />
        {showLabel && (
          <span className="text-sm text-gray-500">
            No transitions available
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusBadge status={currentStatus} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isLoading}
              className="px-3 py-1.5 h-auto text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Change trip status from ${currentStatus.toLowerCase()}. Currently ${
                transitions.length
              } option${transitions.length !== 1 ? "s" : ""} available`}
              aria-haspopup="menu"
              aria-expanded={false}
            >
              {isLoading && (
                <Loader2
                  className="w-3 h-3 mr-1.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              Change Status
              <ChevronDown className="w-3 h-3 ml-1.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="min-w-[200px]"
            role="menu"
          >
            <DropdownMenuLabel className="flex items-center gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Change Trip Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {transitions.map((transition) => (
              <DropdownMenuItem
                key={transition.status}
                onClick={() => handleStatusChange(transition.status)}
                className={`flex items-center gap-2 cursor-pointer focus:outline-none ${
                  "variant" in transition &&
                  transition.variant === "destructive"
                    ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                    : "focus:bg-blue-50"
                }`}
                role="menuitem"
                aria-label={`Change status to ${transition.status.toLowerCase()}: ${
                  transition.description
                }`}
              >
                <StatusBadge
                  status={transition.status}
                  size="sm"
                  variant="minimal"
                  showIcon
                />
                <div className="flex-1">
                  <div className="font-medium">{transition.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {transition.description}
                  </div>
                </div>
                {"variant" in transition &&
                  transition.variant === "destructive" && (
                    <AlertTriangle
                      className="w-4 h-4 text-red-500"
                      aria-hidden="true"
                    />
                  )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {showLabel && (
          <span className="text-sm text-gray-500">
            {transitions.length} option{transitions.length !== 1 ? "s" : ""}{" "}
            available
          </span>
        )}
      </div>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog
        open={confirmation.show}
        onOpenChange={(open) =>
          setConfirmation((prev) => ({ ...prev, show: open }))
        }
      >
        <AlertDialogContent className="bg-white border border-gray-200 shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-900">
              {success ? (
                <span className="flex items-center text-green-600">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Success!
                </span>
              ) : (
                <>
                  {confirmation.variant === "destructive" && (
                    <AlertTriangle
                      className="w-5 h-5 text-red-500"
                      aria-hidden="true"
                    />
                  )}
                  {confirmation.title || "Confirm Status Change"}
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              {success
                ? "Trip status updated successfully."
                : confirmation.description ||
                  "Are you sure you want to change the trip status?"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!success && (
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
              <AlertDialogCancel
                disabled={isLoading}
                className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  confirmation.newStatus &&
                  handleStatusChange(confirmation.newStatus, true)
                }
                disabled={isLoading}
                className={`focus:ring-2 focus:ring-offset-2 text-white ${
                  confirmation.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }`}
                aria-label={`Confirm status change to ${confirmation.newStatus?.toLowerCase()}`}
              >
                {isLoading && (
                  <Loader2
                    className="w-4 h-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default StatusManager;
