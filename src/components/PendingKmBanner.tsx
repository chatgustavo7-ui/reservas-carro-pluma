import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { hasPendingKm } from "@/utils/kmUtils";
import { PendingKmModal } from "./PendingKmModal";

interface PendingKmBannerProps {
  driverName?: string;
}

export const PendingKmBanner = ({ driverName }: PendingKmBannerProps) => {
  const [hasPending, setHasPending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPendingKm = useCallback(async () => {
    if (!driverName) return;
    
    setLoading(true);
    try {
      const pending = await hasPendingKm(driverName);
      setHasPending(pending);
    } catch (error) {
      console.error('Error checking pending KM:', error);
    } finally {
      setLoading(false);
    }
  }, [driverName]);

  useEffect(() => {
    checkPendingKm();
  }, [checkPendingKm]);

  const handleModalClose = () => {
    setShowModal(false);
    // Recarregar status após fechar o modal
    checkPendingKm();
  };

  if (loading || !hasPending || !driverName) {
    return null;
  }

  return (
    <>
      <Alert className="mb-6 border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-warning-foreground">
            Você possui pendência de KM em reservas anteriores. Informe o KM para regularizar.
          </span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowModal(true)}
            className="ml-4 border-warning text-warning hover:bg-warning hover:text-warning-foreground"
          >
            Informar KM agora
          </Button>
        </AlertDescription>
      </Alert>

      <PendingKmModal
        isOpen={showModal}
        onClose={handleModalClose}
        driverName={driverName}
      />
    </>
  );
};