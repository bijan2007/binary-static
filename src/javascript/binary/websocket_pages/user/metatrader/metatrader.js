const localize         = require('../../../base/localize').localize;
const Validation       = require('../../../common_functions/form_validation');
const MetaTraderConfig = require('./metatrader.config');
const MetaTraderUI     = require('./metatrader.ui');

const MetaTrader = (function() {
    'use strict';

    const types_info   = MetaTraderConfig.types_info;
    const actions_info = MetaTraderConfig.actions_info;
    const fields       = MetaTraderConfig.fields;

    let has_financial_company,
        has_gaming_company;

    const onLoad = () => {
        BinarySocket.wait('landing_company').then((response) => {
            if (isEligible(response)) {
                updateEnabledStatus('gaming', has_gaming_company);
                updateEnabledStatus('financial', has_financial_company);
                getAllAccountsInfo();
                MetaTraderUI.init(submit);
            } else {
                MetaTraderUI.displayPageError(localize('Sorry, this feature is not available.'));
            }
        });
    };

    const isEligible = (landing_company_response) => {
        let is_eligible = false;
        if (!landing_company_response.error) {
            const lc              = landing_company_response.landing_company;
            has_financial_company = lc.hasOwnProperty('mt_financial_company') && lc.mt_financial_company.shortcode === 'vanuatu';
            has_gaming_company    = lc.hasOwnProperty('mt_gaming_company') && lc.mt_gaming_company.shortcode === 'costarica';
            if (lc.hasOwnProperty('financial_company') && lc.financial_company.shortcode === 'costarica' &&
                (has_financial_company || has_gaming_company)) {
                is_eligible = true;
            }
        }
        return is_eligible;
    };

    const updateEnabledStatus = (account_type, is_enabled) => {
        Object.keys(types_info).forEach((acc_type) => {
            if (types_info[acc_type].account_type === account_type) {
                types_info[acc_type].is_enabled = is_enabled;
            }
        });
    };

    const getAllAccountsInfo = () => {
        BinarySocket.send({ mt5_login_list: 1 }).then((response) => {
            if (response.mt5_login_list && response.mt5_login_list.length > 0) {
                response.mt5_login_list.map(function(obj) {
                    const acc_type = getAccountType(obj.group);
                    if (acc_type) { // ignore old accounts which are not linked to any group
                        types_info[acc_type].account_info = { login: obj.login };
                        getAccountDetails(obj.login, acc_type);
                    }
                });
            }
            // Update types with no account
            Object.keys(types_info).forEach((acc_type) => {
                if (!types_info[acc_type].account_info) {
                    MetaTraderUI.updateAccount(acc_type);
                }
            });
        });
    };

    const getAccountDetails = (login, acc_type) => {
        MetaTraderUI.displayLoadingAccount(acc_type);
        BinarySocket.send({
            mt5_get_settings: 1,
            login           : login,
        }).then((response) => {
            if (response.mt5_get_settings) {
                types_info[acc_type].account_info = response.mt5_get_settings;
                MetaTraderUI.updateAccount(acc_type);
            }
        });
    };

    const getAccountType = group => (
        group ? (/demo/.test(group) ? 'demo' : group.split('\\')[1] || '') : ''
    );

    const makeRequestObject = (acc_type, action) => {
        const req = {};

        Object.keys(fields[action]).forEach((field) => {
            const field_obj = fields[action][field];
            if (field_obj.request_field) {
                req[field_obj.request_field] = MetaTraderUI.$form().find(field_obj.id).val();
            }
        });

        // set main command
        req[`mt5_${action}`] = 1;

        // add additional fields
        $.extend(req, fields[action].additional_fields(acc_type));

        return req;
    };

    const submit = (e) => {
        e.preventDefault();
        MetaTraderUI.hideFormMessage();
        const $btn_submit = $(e.target);
        const acc_type = $btn_submit.attr('acc_type');
        const action = $btn_submit.attr('action');
        if (Validation.validate(`#frm_${action}`)) {
            MetaTraderUI.disableButton();
            // further validations before submit (password_check)
            MetaTraderUI.postValidate(acc_type, action).then((is_ok) => {
                if (!is_ok) {
                    MetaTraderUI.enableButton();
                    return;
                }

                const req = makeRequestObject(acc_type, action);
                BinarySocket.send(req).then((response) => {
                    if (response.error) {
                        MetaTraderUI.displayFormMessage(response.error.message);
                        MetaTraderUI.enableButton();
                    } else {
                        MetaTraderUI.closeForm();
                        MetaTraderUI.displayMainMessage(actions_info[action].success_msg(response));
                        getAccountDetails(actions_info[action].login ?
                            actions_info[action].login(response) : types_info[acc_type].account_info.login, acc_type);
                    }
                });
            });
        }
    };

    return {
        onLoad    : onLoad,
        isEligible: isEligible,
    };
})();

module.exports = MetaTrader;
