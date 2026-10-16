import { InfoPageLayout } from '@/components/layout/InfoPageLayout';
import { Notice } from '@/components/ui/Notice';

export function ContactPage() {
  return (
    <InfoPageLayout title="Contact & support" intro="How to get help with CareCircle.">
      <Notice tone="neutral" title="Support channels are not yet set up">
        CareCircle is a prototype. Official support contact details will be published here before any public launch.
        Until then, no contact address is listed. We’d rather show nothing than an address nobody monitors.
      </Notice>

      <h2>If something is urgent</h2>
      <p>
        <strong>CareCircle is not an emergency service.</strong> If someone may be unwell or in danger, contact your
        local emergency number immediately. Do not wait for a CareCircle notification.
      </p>

      <h2>Questions about medication or health</h2>
      <p>
        CareCircle only stores the instructions you enter. For questions about medication, doses, side effects or a
        missed dose, speak to a pharmacist, doctor or other qualified health professional.
      </p>

      <h2>Questions about your circle</h2>
      <p>
        If you need access to a care circle, or want your role changed, ask the circle’s administrator. They can manage
        invitations and roles from the <strong>My Care Circle</strong> page.
      </p>
    </InfoPageLayout>
  );
}
