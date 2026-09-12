import { createBrowserRouter } from "react-router";
import { MainLayout } from "./layout/MainLayout";
import { Account } from "./pages/Account";
import { About } from "./pages/About";
import { Cart } from "./pages/Cart";
import { Category } from "./pages/Category";
import { Checkout } from "./pages/Checkout";
import { Contact } from "./pages/Contact";
import { CustomerSignup } from "./pages/CustomerSignup";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Product } from "./pages/Product";
import { Shop } from "./pages/Shop";
import { TermsOfService } from "./pages/TermsOfService";
import { ReferralRedirect } from "./pages/ReferralRedirect";
import { LoginPage } from "./pages/LoginPage";
import { Notifications } from "./pages/Notifications";
import { RFQPage } from "./pages/RFQPage";
import { Subcategories } from "./pages/Subcategories";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Home },
      { path: "shop", Component: Shop },
      { path: "subcategories", Component: Subcategories },
      { path: "category/:slug", Component: Category },
      { path: "product/:slug", Component: Product },
      { path: "products/:slug", Component: Product },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "customer-access/new", Component: CustomerSignup },
      { path: "register", Component: CustomerSignup },
      { path: "signup", Component: CustomerSignup },
      { path: "login", Component: LoginPage },
      { path: "account", Component: Account },
      { path: "profile", Component: Account },
      { path: "orders", Component: Account },
      { path: "rfq", Component: RFQPage },
      { path: "rfqs", Component: RFQPage },
      { path: "about", Component: About },
      { path: "contact", Component: Contact },
      { path: "privacy-policy", Component: PrivacyPolicy },
      { path: "terms-of-service", Component: TermsOfService },
      { path: "refer/:code", Component: ReferralRedirect },
      { path: "notifications", Component: Notifications },
      { path: "*", Component: NotFound },
    ],
  },
]);
