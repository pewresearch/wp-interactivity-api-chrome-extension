const listEl = document.getElementById('element-list');
const refreshBtn = document.getElementById('refresh');

function scanInteractivityFunction() {
	const nodes = Array.from(document.querySelectorAll('*')).filter((el) =>
		Array.from(el.attributes).some((attr) => /^data-wp-/.test(attr.name))
	);
	return nodes.map((el) => {
		let path = [];
		let node = el;
		while (node && node.nodeType === Node.ELEMENT_NODE) {
			let name = node.nodeName.toLowerCase();
			if (node.id) {
				name += '#' + node.id;
				path.unshift(name);
				break;
			}
			const siblings = Array.from(node.parentNode?.children || []);
			const sameTag = siblings.filter(
				(n) => n.nodeName === node.nodeName
			);
			if (sameTag.length > 1) {
				const idx = sameTag.indexOf(node) + 1;
				name += ':nth-of-type(' + idx + ')';
			}
			path.unshift(name);
			node = node.parentNode;
		}
		const directives = Array.from(el.attributes)
			.filter((a) => /^data-wp-/.test(a.name))
			.map((a) => ({ name: a.name, value: a.value }));

		// Add id or className for display
		let idOrClass = '';
		if (el.id) {
			idOrClass = `#${el.id}`;
		} else if (el.className && typeof el.className === 'string') {
			idOrClass = `.${el.className.trim().replace(/\s+/g, '.')}`;
		}

		return { selector: path.join(' > '), directives, idOrClass };
	});
}

function scanInteractivity() {
	chrome.devtools.inspectedWindow.eval(
		`(${scanInteractivityFunction.toString()})()`,
		(results, isException) => {
			if (isException) {
				console.error(isException);
				return;
			}
			listEl.innerHTML = '';
			results.forEach((item) => {
				const li = document.createElement('li');
				let label = item.selector;
				if (item.idOrClass) {
					label += ` [${item.idOrClass}]`;
				}
				label +=
					': ' +
					item.directives
						.map((d) => `${d.name}="${d.value}"`)
						.join(' ');
				li.textContent = label;
				li.addEventListener('click', () => {
					chrome.devtools.inspectedWindow.eval(
						`inspect(document.querySelector('${item.selector.replace(/'/g, "\\'")}'));`
					);
				});
				listEl.appendChild(li);
			});
		}
	);
}

refreshBtn.addEventListener('click', scanInteractivity);
chrome.devtools.panels.onShown.addListener(scanInteractivity);
