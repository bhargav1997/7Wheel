import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CreditTransferModal from './CreditTransferModal';

/**
 * BuyCreditsModal — Real-money purchasing has been disabled for pure free-to-play social gaming.
 * Automatically delegates to CreditTransferModal for peer-to-peer credit sharing and requests.
 */
const BuyCreditsModal = ({ isOpen, onClose }) => {
  const { showBuyCreditsModal, setShowBuyCreditsModal } = useAuth();
  const active = typeof isOpen === 'boolean' ? isOpen : showBuyCreditsModal;

  const handleClose = () => {
    if (onClose) onClose();
    setShowBuyCreditsModal(false);
  };

  return <CreditTransferModal isOpen={active} onClose={handleClose} />;
};

export default BuyCreditsModal;
