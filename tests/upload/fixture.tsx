import { createRoot } from "react-dom/client";
import { SignupForm } from "../../src/components/forms/signup-form";

const departments = [{ id: "fixture-department", slug: "fixture", name: "מחלקת בדיקה", institution: { id: "fixture-hospital", name: "בית חולים לבדיקה", type: "HOSPITAL" as const }, specialty: { id: "fixture-specialty", name: "רפואה פנימית" } }];
createRoot(document.getElementById("root")!).render(
  <main className="account-page"><div className="auth-shell auth-shell--signup"><section className="auth-panel"><SignupForm departments={departments} maxUploadMb={4} /></section></div></main>
);
