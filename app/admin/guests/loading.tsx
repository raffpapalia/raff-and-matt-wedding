// Deep navigations (guest list → household edit / new) keep the shared
// `guests` segment mounted, so the /admin-level loading boundary never fires —
// this re-export gives those transitions the same instant skeleton.
export { default } from '../loading';
