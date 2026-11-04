// Tiny shared guard; importing it never loads the editor or export libraries.
const editors = new Set<() => Promise<boolean>>();
export function registerDocumentSave(save: () => Promise<boolean>) {
  editors.add(save);
  return () => {
    editors.delete(save);
  };
}
export async function flushDocumentEditors() {
  for (const save of editors) if (!(await save())) return false;
  return true;
}
