import {Timer, adjectives, colours, nouns} from '../../doohtml-timer-and-data/Timer.js';

const pick = dict => dict[Math.round(Math.random() * 1000) % dict.length];
const label = () => `${pick(adjectives)} ${pick(colours)} ${pick(nouns)}`;
const labelOf = r => r.firstChild.nextSibling.firstChild.firstChild;

let ID = 1, SEL, TMPL, SIZE;
const [[TABLE], [TBODY], [TROW], BUTTONS] = 'table,tbody,#trow,button'
    .split(',').map(s => document.querySelectorAll(s)), ROWS = TBODY.children;

const {cloneNode, insertBefore} = Node.prototype;
const clone = n => cloneNode.call(n, true);
const insert = insertBefore.bind(TBODY);
const create = (count, add) => {
    if (SIZE !== count)
        TMPL = clone(TROW.content), [...Array((SIZE = count) / 50 - 1)]
            .forEach(() => TMPL.appendChild(clone(TMPL.firstChild)));
    !add && (clear(), TBODY.remove());
    while (count) {
        for (const r of TMPL.children)
            (r.$id ??= r.firstChild.firstChild).nodeValue = ID++,
            (r.$label ??= labelOf(r)).nodeValue = label(), count--;
        insert(clone(TMPL), null);
    }
    !add && TABLE.appendChild(TBODY);
};
const clear = () => (TBODY.textContent = '', SEL = null);

BUTTONS.forEach(function (b) { b.onclick = this[b.id]; }, {
    run () { create(1000); },
    runlots () { 
        Timer.start('tot', 'vanillajs-lite-timer');
        create(10000);
        Timer.stop('tot');
    },
    add () { create(1000, true); },
    clear,
    update () {
        for (let i = 0, r; r = ROWS[i]; i += 10)
            labelOf(r).nodeValue += ' !!!';
    },
    swaprows () {
        const [, r1, r2] = ROWS, r998 = ROWS[998];
        r998 && (insert(r1, r998), insert(r998, r2));
    }
});

TBODY.onclick = e => {
    const t = e.target, n = t.tagName, r = t.closest('TR');
    e.stopPropagation();
    (n == 'SPAN' || n == 'A' && t.firstElementChild) ? r.remove() :
    n == 'A' && (SEL && (SEL.className = ''), (SEL = r).className = 'danger');
};

// Expose Timer to window for testing
if (typeof window !== 'undefined') {
    window.Timer = Timer;
} else if (typeof globalThis !== 'undefined') {
    globalThis.Timer = Timer;
}
