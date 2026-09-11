import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,EN} from '../src/i18n.js';
import {partName} from '../src/part-name.js';
test('dynamic labels and singular quantities are translated without changing part IDs',()=>{
 assert.equal(translate('en','{count} parça masada.',{count:1}),'1 piece on the table.');
 assert.equal(translate('tr','{axis} ekseninde döndür',{axis:'Y'}),'Y ekseninde döndür');
 assert.equal(partName('Brick 1 x 2','en'),'Brick 1 x 2');
 assert.equal(partName('Brick 1 x 2','tr'),'Tuğla 1 x 2');
 assert.equal(translate('en','Ferrari F40'),'Ferrari F40');
});
test('English entries preserve every dynamic placeholder',()=>{
 for(const [tr,en] of Object.entries(EN))assert.deepEqual((tr.match(/\{\w+\}/g)||[]).sort(),(en.match(/\{\w+\}/g)||[]).sort(),tr);
});
