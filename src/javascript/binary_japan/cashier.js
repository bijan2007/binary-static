const BinaryPjax         = require('../binary/base/binary_pjax');
const Client             = require('../binary/base/client');
const localize           = require('../binary/base/localize').localize;
const defaultRedirectUrl = require('../binary/base/url').defaultRedirectUrl;
const jpClient           = require('../binary/common_functions/country_base').jpClient;
const jpResidence        = require('../binary/common_functions/country_base').jpResidence;

const CashierJP = (function() {
    'use strict';

    const onLoad = (action) => {
        if (jpClient() && !jpResidence()) BinaryPjax.load(defaultRedirectUrl());
        const $container = $('#japan_cashier_container');
        BinarySocket.wait('get_settings').then(() => {
            $container.removeClass('invisible');
            if (action === 'deposit') {
                $('#name_id').text((Client.get('loginid') || 'JP12345') + ' ' + (Client.get('first_name') || 'Joe Bloggs'));
            } else if (action === 'withdraw') {
                $('#id123-control22598118').val(Client.get('loginid'));
                $('#id123-control22598060').val(Client.get('email'));
            }
        });
    };

    const errorHandler = () => {
        $('.error-msg').remove();
        const $id = $('#id123-control22598145');
        const withdrawal_amount = $id.val();
        if (!/^([1-9][0-9]{0,5}|1000000)$/.test(withdrawal_amount)) {
            $id.parent().append('<p class="error-msg">' + localize('Please enter a number between [_1].', ['¥1 - ¥1,000,000']) + '</p>');
            return false;
        } else if (parseInt(Client.get('balance')) < withdrawal_amount) {
            $id.parent().append('<p class="error-msg">' + localize('Insufficient balance.') + '</p>');
            return false;
        }
        return true;
    };

    return {
        errorHandler: errorHandler,
        Deposit     : { onLoad: () => { onLoad('deposit'); } },
        Withdraw    : { onLoad: () => { onLoad('withdraw'); } },
    };
})();

module.exports = CashierJP;
