_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[7],{RNiq:function(e,t,n){"use strict";n.r(t),n.d(t,"default",(function(){return i}));var r=n("q1tI"),o=n.n(r),a=n("YFqc"),u=n.n(a),f=o.a.createElement;function i(){return f("div",null,"Hello World."," ",f(u.a,{href:"/about",as:"/francisluz.github.io/about"},f("a",null,"About")))}},YFqc:function(e,t,n){e.exports=n("cTJO")},cTJO:function(e,t,n){"use strict";var r=n("J4zp"),o=n("284h");t.__esModule=!0,t.default=void 0;var a,u=o(n("q1tI")),f=n("g/15"),i=n("nOHt"),c=n("elyg");var s=new Map,l=window.IntersectionObserver,p={};var d=function(e,t){var n=a||(l?a=new l((function(e){e.forEach((function(e){if(s.has(e.target)){var t=s.get(e.target);(e.isIntersecting||e.intersectionRatio>0)&&(a.unobserve(e.target),s.delete(e.target),t())}}))}),{rootMargin:"200px"}):void 0);return n?(n.observe(e),s.set(e,t),function(){try{n.unobserve(e)}catch(t){console.error(t)}s.delete(e)}):function(){}};function v(e,t,n,r){e.prefetch(t,n,r).catch((function(e){0})),p[t+"%"+n]=!0}function h(e,t,n,r,o,a,u){var i=e.currentTarget,c=i.nodeName,s=i.target;"A"===c&&(s&&"_self"!==s||e.metaKey||e.ctrlKey||e.shiftKey||e.nativeEvent&&2===e.nativeEvent.which)||function(e){var t=(0,f.getLocationOrigin)();return new URL(e,t).origin===t}(n)&&(e.preventDefault(),null==u&&(u=r.indexOf("#")<0),t[o?"replace":"push"](n,r,{shallow:a}).then((function(e){e&&u&&(window.scrollTo(0,0),document.body.focus())})))}var w=function(e){var t=!1!==e.prefetch,n=u.default.useState(),o=r(n,2),a=o[0],f=o[1],s=(0,i.useRouter)(),w=u.default.useMemo((function(){var t=(0,c.resolveHref)(s.pathname,e.href);return{href:t,as:e.as?(0,c.resolveHref)(s.pathname,e.as):t}}),[s.pathname,e.href,e.as]),g=w.href,y=w.as;u.default.useEffect((function(){if(t&&l&&a&&a.tagName&&!p[g+"%"+y])return d(a,(function(){v(s,g,y)}))}),[t,a,g,y,s]);var E=e.children,_=e.replace,b=e.shallow,m=e.scroll;"string"===typeof E&&(E=u.default.createElement("a",null,E));var N=u.Children.only(E),M={ref:function(e){e&&f(e),N&&"object"===typeof N&&N.ref&&("function"===typeof N.ref?N.ref(e):"object"===typeof N.ref&&(N.ref.current=e))},onClick:function(e){N.props&&"function"===typeof N.props.onClick&&N.props.onClick(e),e.defaultPrevented||h(e,s,g,y,_,b,m)}};return t&&(M.onMouseEnter=function(e){N.props&&"function"===typeof N.props.onMouseEnter&&N.props.onMouseEnter(e),v(s,g,y,{priority:!0})}),!e.passHref&&("a"!==N.type||"href"in N.props)||(M.href=(0,c.addBasePath)(y)),u.default.cloneElement(N,M)};t.default=w},vlRD:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return n("RNiq")}])}},[["vlRD",0,2,1]]]);