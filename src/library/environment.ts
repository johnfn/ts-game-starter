export const IS_PRODUCTION  = !window.location.href.includes("localhost") || window.location.href.includes("debug=false");
export const IS_DEVELOPMENT = !IS_PRODUCTION;
export const IS_DEBUG       = (IS_DEVELOPMENT || window.location.href.includes("debug=true")) && !(window.location.href.includes("debug=false"));