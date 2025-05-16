(() => {
	const processed = new WeakSet();
	let currentPopover = null;

	function getWPDirectiveAncestorCount(el) {
		let count = 0;
		let parent = el.parentElement;
		while (parent) {
			if (
				Array.from(parent.attributes).some((attr) =>
					/^data-wp-/.test(attr.name)
				)
			) {
				count++;
			}
			parent = parent.parentElement;
		}
		return count;
	}

	function processElement(el) {
		if (processed.has(el)) return;
		processed.add(el);

		const style = getComputedStyle(el);
		if (style.position === 'static') el.style.position = 'relative';

		const dot = document.createElement('div');
		dot.className = 'wp-context-dot';

		// Offset dot by -1em for each ancestor with data-wp-*
		const level = getWPDirectiveAncestorCount(el);
		dot.style.top = `calc(0px - ${level}em)`;
		dot.style.left = `calc(0px - ${level}em)`;

		el.appendChild(dot);

		// Add hover effect to outline the referenced element
		dot.addEventListener('mouseenter', () => {
			el.classList.add('wp-context-dot-outline');
		});
		dot.addEventListener('mouseleave', () => {
			el.classList.remove('wp-context-dot-outline');
		});

		dot.addEventListener('click', (e) => {
			e.stopPropagation();
			if (currentPopover) {
				currentPopover.remove();
				currentPopover = null;
			}

			const directives = Array.from(el.attributes)
				.filter((a) => /^data-wp-/.test(a.name))
				.map((a) => ({ name: a.name, value: a.value }));

			const ul = document.createElement('ul');
			ul.className = 'wp-context-directives';
			directives.forEach((d) => {
				const li = document.createElement('li');
				li.textContent = `${d.name}: ${d.value}`;
				ul.appendChild(li);
			});

			let raw = el.getAttribute('data-wp-context') || '';
			let pretty = raw;
			try {
				const obj = JSON.parse(raw);
				pretty = JSON.stringify(obj, null, 2);
			} catch {}
			const pre = document.createElement('pre');
			pre.textContent = pretty;

			const pop = document.createElement('div');
			pop.className = 'wp-context-popover';

			const elLabel = el.id || el.className;
			if (elLabel) {
				const elLabelEl = document.createElement('div');
				const elLabelSpan = document.createElement('strong');
				elLabelSpan.textContent = 'Element: ';
				elLabelEl.appendChild(elLabelSpan);
				elLabelEl.appendChild(document.createTextNode(elLabel));
				pop.appendChild(elLabelEl);
			}

			if (directives.length) {
				const hd = document.createElement('h4');
				hd.textContent = 'Interactivity Directives';
				pop.appendChild(hd);
				pop.appendChild(ul);
			}
			if (raw) {
				const hd2 = document.createElement('h4');
				hd2.textContent = 'Context JSON';
				pop.appendChild(hd2);
				pop.appendChild(pre);
			}

			el.appendChild(pop);
			currentPopover = pop;
		});
	}

	// Select all elements with any data-wp-* attribute
	function selectAllWPDirectiveElements() {
		return Array.from(document.querySelectorAll('*')).filter((el) =>
			Array.from(el.attributes).some((attr) =>
				/^data-wp-/.test(attr.name)
			)
		);
	}

	selectAllWPDirectiveElements().forEach(processElement);

	new MutationObserver((muts) => {
		for (const m of muts) {
			for (const node of m.addedNodes) {
				if (node.nodeType === 1) {
					// If the node itself has a data-wp-* attribute
					if (
						Array.from(node.attributes || []).some((attr) =>
							/^data-wp-/.test(attr.name)
						)
					) {
						processElement(node);
					}
					// Also check descendants
					node.querySelectorAll &&
						node.querySelectorAll('*').forEach((child) => {
							if (
								Array.from(child.attributes).some((attr) =>
									/^data-wp-/.test(attr.name)
								)
							) {
								processElement(child);
							}
						});
				}
			}
		}
	}).observe(document.documentElement, { childList: true, subtree: true });

	document.addEventListener('click', () => {
		if (currentPopover) {
			currentPopover.remove();
			currentPopover = null;
		}
	});
})();
