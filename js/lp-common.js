/**
 * LP Common JavaScript - Inteligência Brasil
 * Funcionalidades compartilhadas entre todas as Landing Pages
 * v1.0.0
 */

(function() {
    'use strict';

    // ========================================
    // BACK TO TOP
    // ========================================
    function initBackToTop() {
        const backToTop = document.querySelector('.back-to-top');
        if (!backToTop) return;

        window.addEventListener('scroll', function() {
            backToTop.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
        });

        backToTop.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ========================================
    // FAQ ACCORDION
    // ========================================
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(function(item) {
            const question = item.querySelector('.faq-question');
            if (!question) return;

            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');

                // Close all items
                faqItems.forEach(function(faq) {
                    faq.classList.remove('active');
                });

                // Open clicked item if it wasn't active
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    // ========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();
                const headerOffset = 100;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            });
        });
    }

    // ========================================
    // FADE IN ANIMATION ON SCROLL
    // ========================================
    function initFadeInAnimation() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(function(el) {
            observer.observe(el);
        });
    }

    // ========================================
    // FORM VALIDATION (Corporate Email)
    // ========================================
    function initFormValidation() {
        const forms = document.querySelectorAll('form[data-validate]');

        const freeEmailDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'live.com', 'msn.com', 'aol.com', 'icloud.com', 'mail.com',
            'protonmail.com', 'zoho.com', 'yandex.com', 'gmx.com',
            'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br'
        ];

        forms.forEach(function(form) {
            const emailInput = form.querySelector('input[type="email"]');

            if (emailInput) {
                emailInput.addEventListener('blur', function() {
                    validateCorporateEmail(this);
                });
            }

            form.addEventListener('submit', function(e) {
                if (emailInput && !validateCorporateEmail(emailInput)) {
                    e.preventDefault();
                    emailInput.focus();
                }
            });
        });

        function validateCorporateEmail(input) {
            const email = input.value.trim().toLowerCase();
            if (!email) return true; // Let required validation handle empty

            const domain = email.split('@')[1];
            if (domain && freeEmailDomains.includes(domain)) {
                showError(input, 'Por favor, utilize seu e-mail corporativo');
                return false;
            }

            clearError(input);
            return true;
        }

        function showError(input, message) {
            clearError(input);
            input.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.textContent = message;
            errorDiv.style.cssText = 'color: #EF4444; font-size: 12px; margin-top: 4px;';
            input.parentNode.appendChild(errorDiv);
        }

        function clearError(input) {
            input.classList.remove('error');
            const existing = input.parentNode.querySelector('.form-error');
            if (existing) existing.remove();
        }
    }

    // ========================================
    // HEADER SCROLL EFFECT
    // ========================================
    function initHeaderScroll() {
        const header = document.querySelector('header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                header.style.background = 'rgba(10, 22, 40, 0.98)';
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            } else {
                header.style.background = 'rgba(10, 22, 40, 0.9)';
                header.style.boxShadow = 'none';
            }

            lastScroll = currentScroll;
        });
    }

    // ========================================
    // INITIALIZE ALL
    // ========================================
    function init() {
        initBackToTop();
        initFaqAccordion();
        initSmoothScroll();
        initFadeInAnimation();
        initFormValidation();
        initHeaderScroll();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
