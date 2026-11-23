import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DemandMetricValue } from '../../src/components/departments/demand-metric-value';
(globalThis as typeof globalThis & {React: typeof React}).React=React;
test('comparison renders the metric, computed mean, denominator, class and accessible methodology',()=>{
 const html=renderToStaticMarkup(React.createElement(DemandMetricValue,{value:'1.65',comparison:{average:.8175,specialtyCount:28,level:'veryHigh'}}));
 for(const text of ['1.65','0.82','ממוצע כלל המקצועות','28 מקצועות עם נתון','ביקוש גבוה מאוד מהממוצע','<details','<summary','סיווג תצוגה של האתר']) assert(html.includes(text),text);
});
test('a missing profession retains the benchmark without assigning a category',()=>{
 const html=renderToStaticMarkup(React.createElement(DemandMetricValue,{value:null,comparison:{average:.8175,specialtyCount:28,level:null}}));
 assert(html.includes('אין נתון זמין'));assert(html.includes('0.82'));assert(!html.includes('data-demand-level='));
});
