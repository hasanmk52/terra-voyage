"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { TripStatus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Plus,
  Eye,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge, getStatusPriority } from "@/components/trip/status-badge";
import { motion, AnimatePresence } from "framer-motion";

interface Trip {
  id: string;
  title: string;
  destination: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  travelers: number;
  status: TripStatus;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    activities: number;
  };
}

interface TripsResponse {
  trips: Trip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function TripsPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tripId: string | null;
    tripTitle: string;
  }>({ open: false, tripId: null, tripTitle: "" });
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
  });

  const loadTrips = async (pageNum: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = (await apiClient.getTrips({
        page: pageNum,
        limit: 12,
      })) as TripsResponse;

      setTrips(response.trips);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load trips:", error);
      setError("Failed to load trips. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips(page);
  }, [page]);

  // Refresh trips when user returns to the page (e.g., after creating a new trip)
  useEffect(() => {
    const handleFocus = () => {
      // Clear cache and reload trips when user returns to the page
      apiClient.clearCache("/api/user/trips");
      loadTrips(page);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [page]);

  // Preload next page for better UX
  useEffect(() => {
    if (trips.length > 0 && page < pagination.pages) {
      const timer = setTimeout(() => {
        // Prefetch next page in background
        apiClient.getTrips({ page: page + 1, limit: 12 }).catch(() => {
          // Silently fail prefetch
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [trips, page, pagination.pages]);

  const handleViewTrip = (tripId: string) => {
    router.push(`/trip/${tripId}`);
  };

  const handleCreateTrip = () => {
    router.push("/plan");
  };

  const handleRefresh = () => {
    apiClient.clearCache("/api/user/trips");
    loadTrips(page);
  };

  const handleDeleteTrip = (tripId: string, tripTitle: string) => {
    setDeleteError(null);
    setDeleteDialog({ open: true, tripId, tripTitle });
  };

  const confirmDeleteTrip = async () => {
    if (!deleteDialog.tripId) {
      return;
    }

    const tripId = deleteDialog.tripId;

    setDeleteError(null);
    setIsDeleteProcessing(true);
    setDeletingTripId(tripId);
    setOptimisticallyDeletedIds(prev => new Set(prev).add(tripId));

    try {
      await apiClient.deleteTrip(tripId);

      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));

      const newTotal = pagination.total - 1;
      const newPages = Math.max(1, Math.ceil(Math.max(newTotal, 0) / pagination.limit));
      setPagination(prev => ({
        ...prev,
        total: Math.max(newTotal, 0),
        pages: newPages,
      }));

      if (trips.length === 1 && page > 1) {
        setPage(page - 1);
      }

      setDeleteDialog({ open: false, tripId: null, tripTitle: "" });
    } catch (error) {
      console.error("Failed to delete trip:", error);
      setDeleteError("We couldn't delete this trip. Please try again.");
      setOptimisticallyDeletedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tripId);
        return newSet;
      });
    } finally {
      setDeletingTripId(null);
      setIsDeleteProcessing(false);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeleteProcessing) {
      return;
    }
    setDeleteDialog({ open: false, tripId: null, tripTitle: "" });
    setDeleteError(null);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()
    ) {
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return `${startFormatted} - ${endFormatted}`;
  };

  // Sort trips by status priority and then by creation date
  // Filter out optimistically deleted trips for smooth animation
  const sortedTrips = [...trips]
    .filter(trip => !optimisticallyDeletedIds.has(trip.id))
    .sort((a, b) => {
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Error Loading Trips
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Button onClick={() => loadTrips(page)} className="mr-4">
              Try Again
            </Button>
            <Button
              onClick={handleCreateTrip}
              size="default"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold h-11 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Trip
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 tooltip-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 tooltip-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {session?.user?.name
                ? `${session.user.name}'s Trips`
                : "Your Trips"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage and view all your travel plans
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="default"
              className="flex items-center gap-2 h-11 px-4 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 transition-all duration-200 transform hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            {/* Only show Create New Trip button if there are existing trips */}
            {trips.length > 0 && (
              <Button
                onClick={handleCreateTrip}
                size="default"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold h-11 px-6"
              >
                <Plus className="w-4 h-4" />
                Create New Trip
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden animate-pulse">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 mr-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-1" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 mb-0">
                    <Skeleton className="h-3 w-20" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-7 w-14 rounded-lg" />
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && trips.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No trips yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start planning your next adventure by creating your first trip.
            </p>
            <Button
              onClick={handleCreateTrip}
              size="default"
              className="flex items-center gap-2 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold h-11 px-8"
            >
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </Button>
          </div>
        )}

        {/* Trips Grid */}
        {!isLoading && trips.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 tooltip-container">
              <AnimatePresence mode="popLayout">
                {sortedTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: deletingTripId === trip.id ? 0.5 : 1,
                      scale: 1,
                      transition: { duration: 0.15 }
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.85,
                      y: -20,
                      transition: {
                        duration: 0.25,
                        ease: "easeOut"
                      }
                    }}
                  >
                    <Card
                      className={`card-with-tooltip hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 bg-white dark:bg-gray-800 h-full ${
                        deletingTripId === trip.id ? 'pointer-events-none' : ''
                      }`}
                    >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <CardTitle className="text-lg font-semibold line-clamp-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {trip.title}
                      </CardTitle>
                      <div className="relative z-10">
                        <StatusBadge status={trip.status} size="sm" />
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                      <span className="line-clamp-1 font-medium">
                        {trip.destination}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                        <span className="font-medium">
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" />
                          <span>
                            {trip.travelers} traveler
                            {trip.travelers !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {trip.budget && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-emerald-500 dark:text-emerald-400" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-700 dark:text-gray-200">
                                ${trip.budget.toLocaleString()}
                              </span>
                              {trip.travelers > 1 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ~$
                                  {Math.round(
                                    trip.budget / trip.travelers
                                  ).toLocaleString()}
                                  /person
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {trip.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {trip.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 dark:border-gray-700 mb-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewTrip(trip.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrip(trip.id, trip.title);
                          }}
                          disabled={deletingTripId === trip.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-red-200 text-red-600 bg-white rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          {deletingTripId === trip.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {deletingTripId === trip.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.pages) },
                    (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDeleteDialog();
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Delete this trip?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {deleteDialog.tripTitle || "this trip"}
              </span>
              , including every itinerary day and saved activity.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-medium">Heads up!</p>
            <p className="mt-1 leading-relaxed">
              This action can&apos;t be undone. If you think you&apos;ll revisit
              this itinerary later, consider keeping it as a draft instead.
            </p>
          </div>

          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={isDeleteProcessing}
              >
                Keep Trip
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                onClick={(event) => {
                  event.preventDefault();
                  confirmDeleteTrip();
                }}
                disabled={isDeleteProcessing}
              >
                {isDeleteProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete trip
                  </>
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TripsPage() {
  return <TripsPageContent />;
}
