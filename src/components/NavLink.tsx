import { Link, useLocation } from "react-router-dom";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type NavLinkCompatProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "className"
> & {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    { className, activeClassName, pendingClassName, to, ...props },
    ref
  ) => {
    const { pathname } = useLocation();
    const toStr =
      typeof to === "string"
        ? to
        : `${to.pathname ?? ""}${to.search ?? ""}`;
    const isActive =
      toStr === pathname ||
      (toStr.length > 1 && pathname.startsWith(toStr));

    return (
      <Link
        ref={ref}
        to={to}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
