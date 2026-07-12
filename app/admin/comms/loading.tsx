// Deep navigations (comms dashboard → household detail / log / templates) keep
// the shared `comms` segment mounted, so the /admin-level loading boundary
// never fires — this re-export gives those transitions the same instant skeleton.
export { default } from '../loading';
