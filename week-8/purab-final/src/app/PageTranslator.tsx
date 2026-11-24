// Week 8 (Purab): puts the inside pages into French when French is chosen, and back into English
// when English is chosen. It reads what is on screen (text, and the labels screen readers use) and
// swaps in the French from frPages.ts; when React changes a text, the new English is translated too.
import { useEffect } from 'react';
import { useLang } from './i18n';
import { toFrench } from './frPages';

const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'] as const;
const SKIP = 'script,style,code,textarea,[translate="no"]';
const SKIP_ATTR = 'script,style,code,[translate="no"]';

/** What each text or label said in English, so it can be put back. */
const originalText = new Map<Text, string>();
const written = new WeakMap<Text, string>();
const originalAttr = new Map<Element, Partial<Record<(typeof ATTRS)[number], string>>>();
const writtenAttr = new WeakMap<Element, Partial<Record<(typeof ATTRS)[number], string>>>();

function doText(node: Text) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  const now = node.nodeValue ?? '';
  if (written.get(node) === now) return; // our own French
  const fr = toFrench(now);
  originalText.set(node, now);
  if (fr !== null && fr !== now) {
    written.set(node, fr);
    node.nodeValue = fr;
  }
}

function doAttrs(el: Element) {
  if (el.closest(SKIP_ATTR)) return;
  for (const a of ATTRS) {
    const now = el.getAttribute(a);
    if (now === null) continue;
    const mine = writtenAttr.get(el) ?? {};
    if (mine[a] === now) continue;
    const fr = toFrench(now);
    const orig = originalAttr.get(el) ?? {};
    orig[a] = now;
    originalAttr.set(el, orig);
    if (fr !== null && fr !== now) {
      mine[a] = fr;
      writtenAttr.set(el, mine);
      el.setAttribute(a, fr);
    }
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  doAttrs(el);
  el.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach(doAttrs);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) doText(n as Text);
}

function restore() {
  originalText.forEach((en, node) => {
    if (node.isConnected && written.get(node) === node.nodeValue) node.nodeValue = en;
    written.delete(node);
  });
  originalText.clear();
  originalAttr.forEach((orig, el) => {
    const mine = writtenAttr.get(el) ?? {};
    for (const a of ATTRS) if (orig[a] !== undefined && mine[a] === el.getAttribute(a)) el.setAttribute(a, orig[a]!);
    writtenAttr.delete(el);
  });
  originalAttr.clear();
}

export function PageTranslator() {
  const { lang } = useLang();
  useEffect(() => {
    if (lang !== 'fr') return;
    walk(document.body);
    const obs = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target as Text);
        else if (m.type === 'attributes') doAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
      // forget nodes React has removed
      if (originalText.size > 4000) originalText.forEach((_, n) => !n.isConnected && originalText.delete(n));
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => {
      obs.disconnect();
      restore();
    };
  }, [lang]);
  return null;
}
