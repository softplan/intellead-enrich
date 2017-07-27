'use strict';

var request = require('request');

class LeadEnrichmentService {

    constructor(lead_id, email, name, company, cnpj) {
        this._lead_id = lead_id;
        this._email = email;
        this._name = name;
        this._company = company;
        this._cnpj = cnpj;
    }

    enrich(callback){
        var item = {
           '_id': this._lead_id,
            'lead' : {
                'company': this._company,
                'cnpj': this._cnpj
            }
        }
        this.enrichByQcnpjCrawler(item);
        this.enrichByReceitaWS(item);
        return callback(200);
    }

    enrichByQcnpjCrawler(item) {
        var id = item._id;
        var company_name = item.lead.company;
        if (company_name) {
            var queryQcnpjCrawler = 'https://qcnpj-crawler.herokuapp.com/?companyName='+company_name;
            request(queryQcnpjCrawler, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    info.enrichByQcnpjCrawler = true;
                    request.post(
                        'https://intellead-data.herokuapp.com/update-enriched-lead-information',
                        { json: { lead_id: id, rich_information: info } },
                        function (error, response, body) {
                            if (error) {
                                console.log(error);
                            } else if((this._cnpj == null || this._cnpj == undefined) && info.cnpj) {
                                console.log('[enrichByQcnpjCrawler] Lead '+id+' enriched!');
                                item.lead.cnpj = info.cnpj;
                                new LeadEnrichmentService().enrichByReceitaWS(item);
                            }
                        }
                    );
                } else {
                    console.log('QTD ATUAL: ' + item.lead.enrichByQcnpjCrawler)
                    var qtEnrichmentAttempts = {
                        'enrichByQcnpjCrawler' : (item.lead.enrichByQcnpjCrawler ? (item.lead.enrichByQcnpjCrawler+1) : 1)
                    }
                    console.log(qtEnrichmentAttempts);
                    request.post(
                        'https://intellead-data.herokuapp.com/update-enriched-lead-information',
                        { json: { lead_id: id, rich_information: qtEnrichmentAttempts } },
                        function (error, response, body) {
                            if (error) {
                                console.log(error);
                            }
                        }
                    );
                }
            });
        }
    }

    enrichByReceitaWS(item) {
        var id = item._id;
        if (item.lead && item.lead.cnpj) {
            var queryReceitaws = 'https://receitaws-data.herokuapp.com/?cnpj='+item.lead.cnpj;
            request(queryReceitaws, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    info.enrichByReceitaWS = true;
                    request.post(
                        'https://intellead-data.herokuapp.com/update-enriched-lead-information',
                        { json: { lead_id: id, rich_information: info } },
                        function (error, response, body) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('[enrichByReceitaWS] Lead '+id+' enriched!');
                            }
                        }
                    );
                } else {
                    var qtEnrichmentAttempts = {
                        'enrichByReceitaWS' : (item.lead.enrichByReceitaWS ? item.lead.enrichByReceitaWS+1: 1)
                    }
                    request.post(
                        'https://intellead-data.herokuapp.com/update-enriched-lead-information',
                        { json: { lead_id: id, rich_information: qtEnrichmentAttempts } },
                        function (error, response, body) {
                            if (error) {
                                console.log(error);
                            }
                        }
                    );
                }
            });
        }
    }

}
module.exports = LeadEnrichmentService;