import{q as V,v as S,w as O,x as k,y as C,z as I,A as T,B as P,H as Y,C as q,D as E,E as g,F as A,G as B,I as v,J as $,K as j,L as z,M as F,N as G,O as J,P as K,Q,p as W,R as b,i as U,c as X}from"./runtime.BwYEukYZ.js";import{b as Z}from"./disclose-version.CTM61bSQ.js";const x=new Set,D=new Set;function m(r){var R;var e=this,s=e.ownerDocument,_=r.type,o=((R=r.composedPath)==null?void 0:R.call(r))||[],t=o[0]||r.target,d=0,h=r.__root;if(h){var u=o.indexOf(h);if(u!==-1&&(e===document||e===window)){r.__root=e;return}var l=o.indexOf(e);if(l===-1)return;u<=l&&(d=u)}if(t=o[d]||r.target,t!==e){V(r,"currentTarget",{configurable:!0,get(){return t||s}});var w=C,i=I;S(null),O(null);try{for(var a,n=[];t!==null;){var f=t.assignedSlot||t.parentNode||t.host||null;try{var c=t["__"+_];if(c!==void 0&&!t.disabled)if(k(c)){var[H,...M]=c;H.apply(t,[r,...M])}else c.call(t,r)}catch(y){a?n.push(y):a=y}if(r.cancelBubble||f===e||f===null)break;t=f}if(a){for(let y of n)queueMicrotask(()=>{throw y});throw a}}finally{r.__root=e,delete r.currentTarget,S(w),O(i)}}}const rr=["touchstart","touchmove"];function er(r){return rr.includes(r)}function sr(r,e){var s=e==null?"":typeof e=="object"?e+"":e;s!==(r.__t??(r.__t=r.nodeValue))&&(r.__t=s,r.nodeValue=s==null?"":s+"")}function tr(r,e){return L(r,e)}function ir(r,e){T(),e.intro=e.intro??!1;const s=e.target,_=b,o=v;try{for(var t=P(s);t&&(t.nodeType!==8||t.data!==Y);)t=q(t);if(!t)throw E;g(!0),A(t),B();const d=L(r,{...e,anchor:t});if(v===null||v.nodeType!==8||v.data!==$)throw j(),E;return g(!1),d}catch(d){if(d===E)return e.recover===!1&&z(),T(),F(s),g(!1),tr(r,e);throw d}finally{g(_),A(o)}}const p=new Map;function L(r,{target:e,anchor:s,props:_={},events:o,context:t,intro:d=!0}){T();var h=new Set,u=i=>{for(var a=0;a<i.length;a++){var n=i[a];if(!h.has(n)){h.add(n);var f=er(n);e.addEventListener(n,m,{passive:f});var c=p.get(n);c===void 0?(document.addEventListener(n,m,{passive:f}),p.set(n,1)):p.set(n,c+1)}}};u(G(x)),D.add(u);var l=void 0,w=J(()=>{var i=s??e.appendChild(K());return Q(()=>{if(t){W({});var a=X;a.c=t}o&&(_.$$events=o),b&&Z(i,null),l=r(i,_)||{},b&&(I.nodes_end=v),t&&U()}),()=>{var f;for(var a of h){e.removeEventListener(a,m);var n=p.get(a);--n===0?(document.removeEventListener(a,m),p.delete(a)):p.set(a,n)}D.delete(u),N.delete(l),i!==s&&((f=i.parentNode)==null||f.removeChild(i))}});return N.set(l,w),l}let N=new WeakMap;function or(r){const e=N.get(r);e&&e()}export{ir as h,tr as m,sr as s,or as u};