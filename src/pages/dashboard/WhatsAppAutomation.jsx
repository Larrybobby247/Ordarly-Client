import { Link } from 'react-router-dom';
import WhatsAppControls from '../../components/WhatsAppControls';

// WhatsApp automation settings. The three on/off controls live here too (same component, same server rules as the overview).
// Welcome message, hours and the other automation options are added here by the conversation-engine phase.
export default function WhatsAppAutomation() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h3 className="text-lg font-bold">WhatsApp automation settings</h3>
        <p className="text-sm text-ink-500">Choose what Ordarly may do on your WhatsApp number. <Link className="font-semibold text-brand-700 underline" to="/dashboard/whatsapp">Back to WhatsApp Commerce</Link></p>
      </div>
      <WhatsAppControls />
    </div>
  );
}
