const BinaryPjax         = require('../../base/binary_pjax');
const Client             = require('../../base/client');
const Header             = require('../../base/header');
const defaultRedirectUrl = require('../../base/url').defaultRedirectUrl;
const urlFor             = require('../../base/url').urlFor;
const jpClient           = require('../../common_functions/country_base').jpClient;
const jpResidence        = require('../../common_functions/country_base').jpResidence;

const Cashier = (function() {
    'use strict';

    let href = '';
    const hidden_class = 'invisible';

    const showContent = () => {
        Client.activateByClientType();
    };

    const displayTopUpButton = () => {
        BinarySocket.wait('balance').then((response) => {
            const currency = response.balance.currency;
            const balance = +response.balance.balance;
            const can_topup = (currency !== 'JPY' && balance <= 1000) || (currency === 'JPY' && balance <= 100000);
            const top_up_id = '#VRT_topup_link';
            const $a = $(top_up_id);
            const classes = ['toggle', 'button-disabled'];
            const new_el = { class: $a.attr('class').replace(classes[+can_topup], classes[1 - +can_topup]), html: $a.html(), id: $a.attr('id') };
            if (can_topup) {
                href = href || urlFor('/cashier/top_up_virtualws');
                new_el.href = href;
            }
            $a.replaceWith($('<a/>', new_el));
            $(top_up_id).parent().removeClass(hidden_class);
        });
    };

    const onLoad = function() {
        if (jpClient() && !jpResidence()) {
            BinaryPjax(defaultRedirectUrl());
        }
        if (Client.isLoggedIn()) {
            BinarySocket.wait('authorize').then(() => {
                Header.upgradeMessageVisibility(); // To handle the upgrade buttons visibility
                const is_virtual = Client.get('is_virtual');
                if (is_virtual) {
                    displayTopUpButton();
                }
                if (is_virtual || /CR/.test(Client.get('loginid'))) {
                    $('#payment-agent-section').removeClass(hidden_class);
                }
                if (Client.hasGamingFinancialEnabled()) {
                    $('#account-transfer-section').removeClass(hidden_class);
                }
            });
        }
        showContent();
    };

    return {
        onLoad        : onLoad,
        PaymentMethods: { onLoad: () => { showContent(); } },
    };
})();

module.exports = Cashier;
