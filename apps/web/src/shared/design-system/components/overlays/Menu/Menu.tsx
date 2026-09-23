import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import styles from "./Menu.module.css";
import type { MenuProps } from "./Menu.types";
import { classNames, customProperties } from "../../shared";
import { place } from "./placement";

const ITEM = '[role="menuitem"], [role="menuitemcheckbox"]';

/**
 * A surface raised by a control, in the browser's top layer. `popover` owns
 * opening and dismissal by pointer; what it does not own — where the surface
 * goes, and where focus is while it is open — is here.
 */
export const Menu = ({
  trigger,
  label,
  children,
  side = "block-end",
  align = "start",
  onClose,
}: MenuProps) => {
  const surfaceId = useId();
  const surface = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ blockStart: 0, inlineStart: 0 });

  const position = useCallback(() => {
    const element = surface.current;
    const from = anchor.current;
    if (!element || !from) return;

    const rtl = getComputedStyle(element).direction === "rtl";
    const { blockStart, inlineStart } = place(
      from.getBoundingClientRect(),
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      side,
      align,
      rtl,
    );

    setAt({ blockStart, inlineStart });
  }, [side, align]);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;

    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === "open";
      setOpen(isOpen);

      if (isOpen) {
        position();
        element.querySelector<HTMLElement>(ITEM)?.focus();
        return;
      }

      // Focus goes back to the trigger without help here: the popover was opened
      // through its invoker, so the platform restores it on every dismissal.
      onClose?.();
    };

    element.addEventListener("toggle", onToggle);
    return () => element.removeEventListener("toggle", onToggle);
  }, [position, onClose]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Closed here as well as by the platform: a popover's own dismissal answers
    // real input, so a guarantee left to it alone is one nothing can prove.
    if (event.key === "Escape") {
      event.currentTarget.hidePopover();
      return;
    }

    const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)];
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];

    if (step !== undefined) {
      event.preventDefault();
      // Wraps, so the last item's next is the first: a menu is a ring, and a
      // reader holding the key down should never be stranded at an end.
      const next = (current + step + items.length) % items.length;
      items[next].focus();
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? items[0] : items[items.length - 1]).focus();
    }
  };

  return (
    <>
      {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ref: anchor,
        popoverTarget: surfaceId,
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })}
      <div
        ref={surface}
        id={surfaceId}
        popover="auto"
        role="menu"
        aria-label={label}
        className={classNames(styles.root)}
        style={customProperties({
          "--menu-block-start": `${at.blockStart}px`,
          "--menu-inline-start": `${at.inlineStart}px`,
        })}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </>
  );
};
