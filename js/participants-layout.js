function resizeParticipants() {
    const container = document.querySelector('#participants-container');
    const itemCount = container.childElementCount;

    let columnCount = itemCount <= 2 ? 1 : 2;
    let rowCount = Math.ceil(itemCount / columnCount);

    const rect = container.getBoundingClientRect();

    if (rect.width > rect.height) {
        const z = columnCount;
        columnCount = rowCount;
        rowCount = z;
    }


    const itemWidth = rect.width / columnCount;
    const itemHeight = rect.height / rowCount;

    const root = document.querySelector(':root');
    root.style.setProperty('--item-width', `${itemWidth}px`);
    root.style.setProperty('--item-height', `${itemHeight}px`);
}

window.addEventListener('resize', resizeParticipants, false);

window.addEventListener('load', () => {
    const observer = new MutationObserver(function(mutations_list) {
        resizeParticipants();
    });

    const container = document.querySelector('#participants-container');
    observer.observe(container, { subtree: false, childList: true });

    resizeParticipants();
}, false);
