_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[6],{Juyh:function(e,n,t){"use strict";t.r(n),t.d(n,"default",(function(){return i}));var r=t("q1tI"),o=t.n(r),u=t("YFqc"),a=t.n(u),f=o.a.createElement;function i(){return f("div",null,f("div",null,"About us"),f("div",null,"Back to"," ",f(a.a,{href:"/",as:"/francisluz.github.io/"},f("a",null,"Home"))))}},YFqc:function(e,n,t){e.exports=t("cTJO")},cTJO:function(e,n,t){"use strict";var r=t("J4zp"),o=t("284h");n.__esModule=!0,n.default=void 0;var u,a=o(t("q1tI")),f=t("g/15"),i=t("nOHt"),c=t("elyg");var s=new Map,l=window.IntersectionObserver,p={};var d=function(e,n){var t=u||(l?u=new l((function(e){e.forEach((function(e){if(s.has(e.target)){var n=s.get(e.target);(e.isIntersecting||e.intersectionRatio>0)&&(u.unobserve(e.target),s.delete(e.target),n())}}))}),{rootMargin:"200px"}):void 0);return t?(t.observe(e),s.set(e,n),function(){try{t.unobserve(e)}catch(n){console.error(n)}s.delete(e)}):function(){}};function h(e,n,t,r){e.prefetch(n,t,r).catch((function(e){0})),p[n+"%"+t]=!0}function v(e,n,t,r,o,u,a){var i=e.currentTarget,c=i.nodeName,s=i.target;"A"===c&&(s&&"_self"!==s||e.metaKey||e.ctrlKey||e.shiftKey||e.nativeEvent&&2===e.nativeEvent.which)||function(e){var n=(0,f.getLocationOrigin)();return new URL(e,n).origin===n}(t)&&(e.preventDefault(),null==a&&(a=r.indexOf("#")<0),n[o?"replace":"push"](t,r,{shallow:u}).then((function(e){e&&a&&(window.scrollTo(0,0),document.body.focus())})))}var w=function(e){var n=!1!==e.prefetch,t=a.default.useState(),o=r(t,2),u=o[0],f=o[1],s=(0,i.useRouter)(),w=a.default.useMemo((function(){var n=(0,c.resolveHref)(s.pathname,e.href);return{href:n,as:e.as?(0,c.resolveHref)(s.pathname,e.as):n}}),[s.pathname,e.href,e.as]),g=w.href,y=w.as;a.default.useEffect((function(){if(n&&l&&u&&u.tagName&&!p[g+"%"+y])return d(u,(function(){h(s,g,y)}))}),[n,u,g,y,s]);var E=e.children,_=e.replace,b=e.shallow,m=e.scroll;"string"===typeof E&&(E=a.default.createElement("a",null,E));var J=a.Children.only(E),M={ref:function(e){e&&f(e),J&&"object"===typeof J&&J.ref&&("function"===typeof J.ref?J.ref(e):"object"===typeof J.ref&&(J.ref.current=e))},onClick:function(e){J.props&&"function"===typeof J.props.onClick&&J.props.onClick(e),e.defaultPrevented||v(e,s,g,y,_,b,m)}};return n&&(M.onMouseEnter=function(e){J.props&&"function"===typeof J.props.onMouseEnter&&J.props.onMouseEnter(e),h(s,g,y,{priority:!0})}),!e.passHref&&("a"!==J.type||"href"in J.props)||(M.href=(0,c.addBasePath)(y)),a.default.cloneElement(J,M)};n.default=w},rB5V:function(e,n,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/about",function(){return t("Juyh")}])}},[["rB5V",0,2,1]]]);