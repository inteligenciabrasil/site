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

                // Close all items (class + aria-expanded stay in sync — A11Y-06)
                faqItems.forEach(function(faq) {
                    faq.classList.remove('active');
                    var q = faq.querySelector('.faq-question');
                    if (q) q.setAttribute('aria-expanded', 'false');
                });

                // Open clicked item if it wasn't active
                if (!isActive) {
                    item.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
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

        // Espelha PERSONAL_EMAIL_DOMAINS / DISPOSABLE_EMAIL_DOMAINS do Codigo.gs.
        // Aqui e so feedback imediato; o portao que vale e o servidor.
        const freeEmailDomains = [
            'gmail.com', 'gmail.com.br', 'googlemail.com',
            'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br',
            'live.com', 'live.com.br', 'msn.com',
            'yahoo.com', 'yahoo.com.br', 'ymail.com', 'rocketmail.com',
            'icloud.com', 'me.com', 'mac.com', 'aol.com', 'aol.com.br',
            'protonmail.com', 'protonmail.ch', 'proton.me', 'pm.me',
            'zoho.com', 'zohomail.com', 'mail.com', 'email.com',
            'gmx.com', 'gmx.net', 'yandex.com', 'mail.ru',
            'tutanota.com', 'tuta.io', 'fastmail.com', 'hushmail.com', 'hey.com',
            'qq.com', '163.com',
            'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br',
            'itelefonica.com.br', 'globo.com', 'globomail.com', 'r7.com',
            'zipmail.com.br', 'oi.com.br', 'pop.com.br', 'click21.com.br',
            'superig.com.br', 'brturbo.com.br', 'ibest.com.br'
        ];

        const tempEmailDomains = [
            'mailinator.com', 'mailinator.net', 'yopmail.com', 'yopmail.fr',
            'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.biz',
            'sharklasers.com', 'grr.la', 'spam4.me',
            '10minutemail.com', '10minutemail.net', 'minuteinbox.com',
            'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempr.email',
            'tempmail.plus', 'mytemp.email', 'throwaway.email', 'throwawaymail.com',
            'trashmail.com', 'trashmail.de', 'fakeinbox.com', 'dispostable.com',
            'getairmail.com', 'getnada.com', 'nada.email', 'maildrop.cc',
            'mailnesia.com', 'mailcatch.com', 'mohmal.com', 'discard.email',
            'emailondeck.com', 'spamgourmet.com', 'jetable.org', 'moakt.com',
            'burnermail.io', '33mail.com', 'mailsac.com', 'inboxkitten.com'
        ];

        // Sobe os rotulos para pegar subdominio (xyz.mailinator.com).
        // Para no penultimo, entao 'com.br' nunca vira chave de busca.
        function blockedReason(domain) {
            const parts = domain.split('.');
            for (let i = 0; i <= parts.length - 2; i++) {
                const candidate = parts.slice(i).join('.');
                if (tempEmailDomains.indexOf(candidate) !== -1) return 'temp';
                if (freeEmailDomains.indexOf(candidate) !== -1) return 'free';
            }
            return '';
        }

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
                    e.stopImmediatePropagation();
                    emailInput.focus();
                }
            });
        });

        function validateCorporateEmail(input) {
            const email = input.value.trim().toLowerCase();
            if (!email) return true; // Let required validation handle empty

            const domain = email.split('@')[1];
            const reason = domain ? blockedReason(domain) : '';
            if (reason === 'temp') {
                showError(input, 'E-mails temporarios nao sao aceitos');
                return false;
            }
            if (reason === 'free') {
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
    // TELEFONE (mascara BR)
    // ========================================
    // O input so aceita digitos; o pattern do HTML barra o resto no checkValidity.
    // ponytail: cursor volta para o fim ao editar no meio do valor. So vale a pena
    // preservar a posicao se alguem reclamar.
    function initTelMask() {
        document.querySelectorAll('input[type="tel"]').forEach(function(el) {
            el.addEventListener('input', function() {
                var d = el.value.replace(/\D/g, '').slice(0, 11);
                if (d.length < 3) { el.value = d; return; }
                var cut = d.length > 10 ? 7 : 6;
                var rest = d.slice(cut);
                el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, cut) + (rest ? '-' + rest : '');
            });
        });
    }

    // ========================================
    // FORM SUBMIT (fetch + status)
    // ========================================
    function initFormSubmit() {
        var forms = document.querySelectorAll('form[data-validate]');
        if (!forms.length) return;

        forms.forEach(function(form) {
            var msgEl = form.querySelector('#formMessage');
            if (!msgEl) return;

            form.addEventListener('submit', function(e) {
                e.preventDefault();

                // E2/partial: focus first invalid field, do not submit
                if (!form.checkValidity()) {
                    var firstInvalid = form.querySelector(':invalid');
                    if (firstInvalid) firstInvalid.focus();
                    return;
                }

                var submitBtn = form.querySelector('[type="submit"]');
                var originalLabel = submitBtn ? submitBtn.textContent : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Enviando...';
                }

                fetch(form.action, { method: 'POST', body: new FormData(form) })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        var result = (typeof data === 'object') ? data.result || data.status || '' : data;
                        if (result === 'success' || result === 'ok') {
                            msgEl.style.display = 'block';
                            msgEl.style.background = 'rgba(16,185,129,0.1)';
                            msgEl.style.color = '#10B981';
                            msgEl.textContent = 'Mensagem enviada! Nossa equipe retornará em até 2 horas úteis.';
                            msgEl.focus();
                        } else {
                            throw new Error('server error');
                        }
                    })
                    .catch(function() {
                        msgEl.style.display = 'block';
                        msgEl.style.background = 'rgba(239,68,68,0.1)';
                        msgEl.style.color = '#EF4444';
                        msgEl.textContent = '';
                        var errorSpan = document.createElement('span');
                        errorSpan.textContent = 'Ocorreu um erro ao enviar. Tente novamente ou fale conosco pelo ';
                        var fallbackLink = document.createElement('a');
                        fallbackLink.setAttribute('href', form.dataset.waFallback);
                        fallbackLink.setAttribute('target', '_blank');
                        fallbackLink.setAttribute('rel', 'noopener');
                        fallbackLink.textContent = 'WhatsApp';
                        msgEl.appendChild(errorSpan);
                        msgEl.appendChild(fallbackLink);
                        msgEl.focus();
                    })
                    .finally(function() {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalLabel;
                        }
                    });
            });
        });
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
        initTelMask();
        initFormSubmit();
        initHeaderScroll();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
