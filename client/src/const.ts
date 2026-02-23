export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Returns the sign-in URL, optionally preserving the intended destination.
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath && returnPath !== "/signin" && returnPath !== "/signup" && returnPath !== "/") {
    const params = new URLSearchParams({ next: returnPath });
    return `/signin?${params.toString()}`;
  }
  return "/signin";
};
