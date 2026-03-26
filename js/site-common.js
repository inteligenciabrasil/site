/**
 * site-common.js - Inteligencia Brasil
 * Replaces jQuery + Bootstrap JS + jQuery Easing
 * Vanilla JavaScript - Zero dependencies
 */
(function () {
    'use strict';

    // ========== 1. NAVBAR COLLAPSE TOGGLE ==========
    // Replaces Bootstrap collapse for navbar toggler
    document.addEventListener('click', function (e) {
        var toggler = e.target.closest('[data-toggle="collapse"]');
        if (!toggler) return;

        var targetSel = toggler.getAttribute('data-target') || toggler.getAttribute('href');
        var target = document.querySelector(targetSel);
        if (!target) return;

        var isShown = target.classList.contains('show');
        target.classList.toggle('show', !isShown);
        toggler.classList.toggle('collapsed', isShown);
        toggler.setAttribute('aria-expanded', String(!isShown));
    });

    // Close navbar on nav-link click (mobile UX)
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.navbar-nav .nav-link') || e.target.closest('.dropdown-toggle')) return;
        var openNav = document.querySelector('.navbar-collapse.show');
        if (!openNav) return;
        openNav.classList.remove('show');
        var tog = document.querySelector('.navbar-toggler');
        if (tog) {
            tog.classList.add('collapsed');
            tog.setAttribute('aria-expanded', 'false');
        }
    });

    // ========== 1b. DROPDOWN TOGGLE (mobile + keyboard) ==========
    // Click toggle for touch devices & keyboard accessibility
    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('.dropdown-toggle');
        if (!toggle) {
            // Click outside: close all open dropdowns
            document.querySelectorAll('.navbar-custom .dropdown.show').forEach(function (d) {
                d.classList.remove('show');
                d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
            return;
        }
        e.preventDefault();
        var dropdown = toggle.closest('.dropdown');
        var isOpen = dropdown.classList.contains('show');

        // Close other open dropdowns
        document.querySelectorAll('.navbar-custom .dropdown.show').forEach(function (d) {
            d.classList.remove('show');
            d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        });

        // Toggle current
        if (!isOpen) {
            dropdown.classList.add('show');
            toggle.setAttribute('aria-expanded', 'true');
        }
    });

    // Keyboard navigation for dropdown
    document.addEventListener('keydown', function (e) {
        var dropdown = e.target.closest('.navbar-custom .dropdown');
        if (!dropdown) return;

        if (e.key === 'Escape') {
            dropdown.classList.remove('show');
            dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            dropdown.querySelector('.dropdown-toggle').focus();
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var items = dropdown.querySelectorAll('.dropdown-item');
            if (!items.length) return;
            var idx = Array.prototype.indexOf.call(items, document.activeElement);
            if (e.key === 'ArrowDown') idx = idx < items.length - 1 ? idx + 1 : 0;
            else idx = idx > 0 ? idx - 1 : items.length - 1;
            items[idx].focus();
        }

        if (e.key === 'Enter' && e.target.classList.contains('dropdown-toggle')) {
            e.preventDefault();
            var isOpen = dropdown.classList.contains('show');
            dropdown.classList.toggle('show', !isOpen);
            e.target.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) {
                var first = dropdown.querySelector('.dropdown-item');
                if (first) first.focus();
            }
        }
    });

    // ========== 2. NAVBAR SCROLL EFFECT ==========
    var navbarCustom = document.querySelector('.navbar-custom');
    var scrollTicking = false;
    var lastScrollY = 0;
    function handleNavScroll() {
        navbarCustom.classList.toggle('top-nav-collapse', lastScrollY > 20);
        scrollTicking = false;
    }
    if (navbarCustom) {
        window.addEventListener('scroll', function () {
            lastScrollY = window.pageYOffset;
            if (!scrollTicking) {
                requestAnimationFrame(handleNavScroll);
                scrollTicking = true;
            }
        }, { passive: true });
        lastScrollY = window.pageYOffset;
        handleNavScroll();
    }

    // ========== 3. SMOOTH SCROLL ==========
    // Replaces jQuery animate + easing
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a.page-scroll, a[href^="#"]');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || href === '#' || href.indexOf('#') !== 0) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
    });

    // ========== 4. BACK TO TOP ==========
    var backBtn = document.querySelector('.back-to-top');
    if (backBtn) {
        window.addEventListener('scroll', function () {
            backBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
        }, { passive: true });
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ========== 5. FAQ ACCORDION ==========
    document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item = this.closest('.faq-item');
            var isActive = item.classList.contains('active');

            // Close all open items
            document.querySelectorAll('.faq-item.active').forEach(function (el) {
                el.classList.remove('active');
                var q = el.querySelector('.faq-question');
                if (q) q.setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ========== 6. SPINNER FADEOUT ==========
    var spinner = document.querySelector('.spinner-wrapper');
    if (spinner) {
        window.addEventListener('load', function () {
            spinner.style.transition = 'opacity 0.3s';
            spinner.style.opacity = '0';
            setTimeout(function () { spinner.style.display = 'none'; }, 300);
        });
        // Fallback timeout
        setTimeout(function () {
            if (spinner) spinner.style.display = 'none';
        }, 3000);
    }

    // ========== 7. FADE-IN ON SCROLL ==========
    if ('IntersectionObserver' in window) {
        var fadeObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(function (el) {
            fadeObserver.observe(el);
        });
    }

    // ========== 8. MID-ARTICLE CTA ==========
    if (document.querySelector('.article-body')) {
        var ctaDiv = document.createElement('div');
        ctaDiv.className = 'mid-article-cta';
        ctaDiv.innerHTML = '<div class="mid-article-cta-text"><strong>Precisa de ajuda especializada?</strong>Fale com nossos consultores sobre seu projeto de seguran\u00e7a.</div><a href="/index.html#contato" class="cta-btn">Falar com Especialista</a><button class="mid-article-cta-close" aria-label="Fechar">\u00d7</button>';
        document.body.appendChild(ctaDiv);

        var ctaDismissed = false;
        var ctaClose = ctaDiv.querySelector('.mid-article-cta-close');
        ctaClose.addEventListener('click', function () {
            ctaDismissed = true;
            ctaDiv.classList.add('dismissed');
            ctaDiv.classList.remove('visible');
        });

        var articleBody = document.querySelector('.article-body');
        var ctaTicking = false;
        window.addEventListener('scroll', function () {
            if (ctaDismissed || ctaTicking) return;
            ctaTicking = true;
            requestAnimationFrame(function () {
                var rect = articleBody.getBoundingClientRect();
                var articleHeight = articleBody.offsetHeight;
                var scrolled = -rect.top;
                var progress = scrolled / articleHeight;
                if (progress > 0.4 && progress < 0.95) {
                    ctaDiv.classList.add('visible');
                } else {
                    ctaDiv.classList.remove('visible');
                }
                ctaTicking = false;
            });
        }, { passive: true });
    }

})();
