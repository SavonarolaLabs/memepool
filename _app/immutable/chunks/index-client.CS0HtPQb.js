import{S as A,V as h,Q as d,W as y,R as u,G as R,T as b,X as m,Y as x,F,E as T,I as N,Z as Y,_ as g,b as o,$ as q,a0 as v,c,a as w}from"./runtime.BwYEukYZ.js";function p(s){throw new Error("lifecycle_outside_component")}function M(s,a,n,l=null,i=!1){u&&R();var f=s,t=null,e=null,r=null,S=i?b:0;A(()=>{if(r===(r=!!a()))return;let _=!1;if(u){const k=f.data===m;r===k&&(f=x(),F(f),T(!1),_=!0)}r?(t?h(t):t=d(()=>n(f)),e&&y(e,()=>{e=null})):(e?h(e):l&&(e=d(()=>l(f))),t&&y(t,()=>{t=null})),_&&T(!0)},S),u&&(f=N)}function E(s,a){return s===a||(s==null?void 0:s[v])===a}function O(s={},a,n,l){return Y(()=>{var i,f;return g(()=>{i=f,f=[],o(()=>{s!==n(...f)&&(a(s,...f),i&&E(n(...i),s)&&a(null,...i))})}),()=>{q(()=>{f&&E(n(...f),s)&&a(null,...f)})}}),s}function D(s){c===null&&p(),c.l!==null?I(c).m.push(s):w(()=>{const a=o(s);if(typeof a=="function")return a})}function B(s){c===null&&p(),D(()=>()=>o(s))}function I(s){var a=s.l;return a.u??(a.u={a:[],b:[],m:[]})}export{B as a,O as b,M as i,D as o};