/** The Corner Chronicle's papers (from NewsStand/papers.json), for the TV news crawl */
export type Paper = { id: string; name: string; when: string; motto: string; by: string; color: string };

export const papers: Paper[] = [
    { id: 'double-wide', name: 'The Double Wide', when: 'Daily', motto: "All the news that's fit to roll", by: 'Ganja', color: '#e07a24' },
    { id: 're-up', name: 'The Re-Up', when: 'Daily', motto: 'What the Garden needs', by: 'Ganja', color: '#9c2a1c' },
    { id: 'dime-bags', name: 'Dime Bags', when: 'Nightly', motto: "Tonight's lines · last night's results", by: 'Disco Stu', color: '#1f4a2a' },
    { id: 'crossword-times', name: 'The Crossword Times', when: 'Daily + extras', motto: 'Pencils down at midnight', by: 'the Garden', color: '#111111' },
    { id: 'sunday-smoke', name: 'The Sunday Smoke', when: 'Sundays', motto: 'The whole week, rolled up', by: 'Ganja', color: '#6a4a8a' },
    { id: 'roach-clips', name: 'Roach Clips', when: 'Tuesdays + nightly', motto: 'Clip it · Try it · Keep it', by: 'B.I.G', color: '#c43d3d' },
    { id: 'trail-mix', name: 'Trail Mix', when: 'Monthly · the 1st', motto: 'Salty, sweet, a little nutty', by: 'Maple & Herbie', color: '#8a6a3a' },
    { id: 'dab', name: 'DAB', when: 'Monthly', motto: "The Garden's humor magazine", by: 'the whole Garden', color: '#ffd23d' },
    { id: 'hashish', name: 'HASHISH', when: 'Monthly · the 15th', motto: 'Centerfold · interview · strain of the month', by: 'Disco Stu', color: '#3a2618' },
    { id: 'seed-catalog', name: 'The Seed Catalog', when: 'New packs monthly', motto: 'Plant an idea, grow a project', by: 'B.I.G & CHRONIC', color: '#4f8a3a' },
    { id: 'perennial', name: 'The Perennial', when: 'Grows every month', motto: 'Comes back every year, deeper rooted', by: 'the Garden', color: '#2f6b4f' },
    { id: 'baked-goods', name: 'Baked Goods', when: 'New recipes Saturdays', motto: 'Tried, tested & fresh out of the oven', by: 'CHRONIC', color: '#c9a070' },
    { id: 'green-thumb', name: 'The Green Thumb', when: 'Always on the shelf', motto: 'Every device, app & login', by: 'the agents', color: '#5bd16a' },
    { id: 'yearbook', name: "The Garden '26", when: 'Yearly', motto: 'Stay rad, never change', by: 'the Class of 2026', color: '#7a3fd1' },
];
