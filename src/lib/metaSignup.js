// Meta Embedded Signup (browser side). Opens Meta's popup; the popup returns a one-time code plus the ids of the business account and number
// the owner chose. We hand both to OUR server, which exchanges the code for the access token. No token or secret is ever handled here.
let sdk = null;
function loadSdk(appId, version) {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => { window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version }); resolve(window.FB); };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js'; s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
    s.onerror = () => { sdk = null; reject(new Error('Could not load Facebook. Check your connection or ad blocker and try again.')); };
    document.body.appendChild(s);
  });
  return sdk;
}

/** Resolves { code, wabaId, phoneNumberId, coexistence } or rejects with a friendly message (also when the owner closes the popup). */
export async function startEmbeddedSignup({ appId, configId, apiVersion }) {
  const FB = await loadSdk(appId, apiVersion);
  return new Promise((resolve, reject) => {
    let session = null, code = null, done = false;
    const finish = () => {
      if (done || !code || !session) return;
      done = true; window.removeEventListener('message', onMsg);
      resolve({ code, wabaId: session.waba_id, phoneNumberId: session.phone_number_id, coexistence: !!session.coexistence });
    };
    function onMsg(ev) {
      if (!/(^|\.)facebook\.com$/.test(new URL(ev.origin).hostname)) return; // only Meta's own popup is believed
      let d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch { return; }
      if (d?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (d.event === 'FINISH' || d.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        session = { waba_id: d.data?.waba_id, phone_number_id: d.data?.phone_number_id, coexistence: d.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' };
        finish();
      } else if (d.event === 'CANCEL') { done = true; window.removeEventListener('message', onMsg); reject(new Error('Connection cancelled.')); }
    }
    window.addEventListener('message', onMsg);
    FB.login((r) => {
      if (r?.authResponse?.code) { code = r.authResponse.code; finish(); }
      else if (!done) { done = true; window.removeEventListener('message', onMsg); reject(new Error('Connection cancelled.')); }
    }, { config_id: configId, response_type: 'code', override_default_response_type: true, extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' } });
  });
}
