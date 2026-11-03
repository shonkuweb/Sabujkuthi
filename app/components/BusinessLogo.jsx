import { business } from "../../lib/business.mjs";

export default function BusinessLogo({ className }) {
  return <img className={className} src={business.logoCdn || business.logo} alt={business.name} width={2048} height={683} />;
}
