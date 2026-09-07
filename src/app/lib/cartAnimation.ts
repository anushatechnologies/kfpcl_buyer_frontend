export const CART_FLY_EVENT = "kfpcl:cart-fly";
export const CART_BUMP_EVENT = "kfpcl:cart-bump";

export interface CartAnimationRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CartFlyEventDetail {
  imageUrl: string;
  startRect: CartAnimationRect;
}

const toAnimationRect = (rect: DOMRect | CartAnimationRect): CartAnimationRect => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

export const getVisibleCartTarget = () => {
  if (typeof document === "undefined") return null;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target="true"]'));
  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      const styles = window.getComputedStyle(target);
      return rect.width > 0 && rect.height > 0 && styles.display !== "none" && styles.visibility !== "hidden";
    }) || null
  );
};

export const triggerCartFeedback = (options: {
  imageUrl?: string | null;
  sourceElement?: Element | null;
  sourceRect?: DOMRect | CartAnimationRect | null;
}) => {
  if (typeof window === "undefined") return;

  const resolvedRect =
    options.sourceRect
      ? toAnimationRect(options.sourceRect)
      : options.sourceElement
        ? toAnimationRect(options.sourceElement.getBoundingClientRect())
        : null;

  if (options.imageUrl && resolvedRect && resolvedRect.width > 0 && resolvedRect.height > 0) {
    window.dispatchEvent(
      new CustomEvent<CartFlyEventDetail>(CART_FLY_EVENT, {
        detail: {
          imageUrl: options.imageUrl,
          startRect: resolvedRect,
        },
      }),
    );
  }

  window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT));
};
