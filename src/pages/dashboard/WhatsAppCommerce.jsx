import { Link } from 'react-router-dom';
import WhatsAppControls from '../../components/WhatsAppControls';

// WhatsApp Commerce overview. The on/off controls come first; the usage, credits and performance panels are added by the later WhatsApp phases.
export default function WhatsAppCommerce() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h3 className="text-lg font-bold">💬 WhatsApp Commerce</h3>
        <p className="text-sm text-ink-500">Take orders and talk to customers on your own WhatsApp number. You are always in control: connect or disconnect, and switch automation and orders on or off, whenever you like.</p>
      </div>
      <WhatsAppControls />
      <p className="text-sm text-ink-500">More automation options are on the <Link className="font-semibold text-brand-700 underline" to="/dashboard/whatsapp/automation">WhatsApp automation settings</Link> page.</p>
    </div>
  );
}
