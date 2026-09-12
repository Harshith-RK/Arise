/**
 * Runs synchronously in <head> before first paint so the saved skin, rank
 * temperature and motion preference never flash. Mirrors src/lib/prefs.ts.
 */
export const PREFS_STORAGE_KEY = "wa:prefs";
export const RANK_STORAGE_KEY = "wa:rank";

export const prefsScript = `(function(){try{
var d=document.documentElement,p={};
try{p=JSON.parse(localStorage.getItem("${PREFS_STORAGE_KEY}")||"{}")||{}}catch(e){}
var mm=function(q){return window.matchMedia&&window.matchMedia(q).matches};
var skin=p.skin||"system";
if(skin==="system"){skin=mm("(prefers-color-scheme: light)")?"whiteout":"permafrost"}
d.setAttribute("data-skin",skin);
var motion=p.motion||"system";
if(motion==="system"){motion=mm("(prefers-reduced-motion: reduce)")?"reduced":"full"}
d.setAttribute("data-motion",motion);
var r=localStorage.getItem("${RANK_STORAGE_KEY}");
d.setAttribute("data-rank",/^[EDCBAS]$/.test(r||"")?r:"E");
}catch(e){}})();`;
