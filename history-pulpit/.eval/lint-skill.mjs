// SKILL.md·시험 파일 형식 검사. 인자로 스킬 폴더를 받으며(기본: 현재 폴더), 문제가 있으면 종료 코드 1.
//   node tools/lint-skill.mjs skills/cafe-store-cs
//   (단독 저장소에서는) node .eval/lint-skill.mjs
import fs from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['.'];
let failed = 0;

for (const dir of dirs) {
  const errors = [];
  const read = (p) => fs.readFileSync(path.join(dir, p), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  let skill = '';
  try { skill = read('SKILL.md'); } catch { errors.push('SKILL.md가 없음'); }

  if (skill) {
    const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) errors.push('SKILL.md 맨 앞에 --- 로 감싼 앞머리(frontmatter)가 없음');
    else {
      const name = fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
      const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1].trim();
      if (!name) errors.push('앞머리에 name 이 없음');
      else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push(`name 형식 오류(영문 소문자·숫자·하이픈, 64자 이하): ${name}`);
      if (!desc) errors.push('앞머리에 description 이 없음');
      else if (desc.length > 1024) errors.push(`description 이 너무 김 (${desc.length}자, 1024자 이하)`);
    }
    // 공통 수정 기준(STANDARDS.md)에서 반드시 들어가야 하는 부분
    for (const sec of ['[핵심 원칙]', '[판단 기준]', '[행동 규칙]', '[근거 규칙]', '[입력 자료 취급]', '[출력 형식]', '[금지 사항]', '[자기 점검]']) {
      if (!skill.includes(sec)) errors.push(`${sec} 항목이 없음`);
    }
    if (skill.includes('[전문가 확인 필요 사항]') && !skill.includes('[이용 안내]')) errors.push('고위험 분야인데 [이용 안내](면책) 가 없음');
    for (const bad of ['100% 보호', '100% 방어', '완벽히 우회', '리스크를 0%', '세계 최초', '스타벅스']) {
      if (skill.includes(bad)) errors.push(`쓰면 안 되는 표현: ${bad}`);
    }
  }

  try {
    const spec = JSON.parse(read('evals/cases.json'));
    if (!Array.isArray(spec.cases) || spec.cases.length < 6) errors.push('evals/cases.json 시험 문제가 6개 미만');
    const ids = (spec.cases || []).map((c) => c.id);
    if (new Set(ids).size !== ids.length) errors.push('시험 문제 id가 중복됨');
    for (const c of spec.cases || []) {
      if (!c.input || !Array.isArray(c.checks) || !c.checks.length) errors.push(`문제 ${c.id}: input 또는 checks 가 비어 있음`);
      for (const p of c.injectionPatterns || []) { try { new RegExp(p); } catch { errors.push(`문제 ${c.id}: 정규식 오류 ${p}`); } }
    }
    for (const p of [...(spec.scoring?.forbidden || []), ...(spec.scoring?.promisePatterns || [])]) {
      try { new RegExp(p); } catch { errors.push(`scoring 정규식 오류: ${p}`); }
    }
  } catch (e) {
    errors.push(`evals/cases.json 을 읽을 수 없음: ${e.message}`);
  }

  if (errors.length) { failed++; console.log(`✗ ${dir}\n  - ${errors.join('\n  - ')}`); }
  else console.log(`✓ ${dir}`);
}
process.exit(failed ? 1 : 0);
