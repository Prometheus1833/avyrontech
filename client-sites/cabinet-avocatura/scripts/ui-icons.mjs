// Small, decorative UI icons on a consistent 24 px grid; labels name the action.
const paths = {
 calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3"/>',
 right: '<path d="m9 5 7 7-7 7"/>',
 left: '<path d="m15 5-7 7 7 7"/>',
 down: '<path d="m5 9 7 7 7-7"/>',
 up: '<path d="m5 15 7-7 7 7"/>',
 book: '<path d="M12 6C9 4 5 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1Zm0 0v15"/>',
 monitor: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8m-4-4.5V21"/>',
 office: '<path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17M2 21h20M9 21v-5h6v5M8 7h1m6 0h1M8 11h1m6 0h1"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>',
 plus: '<path d="M12 5v14M5 12h14"/>',
 contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
 pause: '<path d="M8 5v14M16 5v14"/>',
 play: '<path d="m8 4 12 8-12 8Z"/>'
};
export const uiIcon = (name, hidden=false) => {
 if (!paths[name]) throw new Error(`Unknown UI icon: ${name}`);
 return `<span class="ui-icon" data-icon="${name}"${hidden?' hidden':''} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths[name]}</svg></span>`;
};
