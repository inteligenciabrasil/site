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
        if (!e.target.closest('.navbar-nav .nav-link')) return;
        var openNav = document.querySelector('.navbar-collapse.show');
        if (!openNav) return;
        openNav.classList.remove('show');
        var tog = document.querySelector('.navbar-toggler');
        if (tog) {
            tog.classList.add('collapsed');
            tog.setAttribute('aria-expanded', 'false');
        }
    });

    // ========== 2. NAVBAR SCROLL EFFECT ==========
    var navbarCustom = document.querySelector('.navbar-custom');
    function handleNavScroll() {
        if (!navbarCustom) return;
        navbarCustom.classList.toggle('top-nav-collapse', window.pageYOffset > 20);
    }
    if (navbarCustom) {
        window.addEventListener('scroll', handleNavScroll, { passive: true });
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

})();
