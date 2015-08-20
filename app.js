(function() {
  return {
    dataFetched: false,
    requests: {
      fetchData: function(args) {
        return {
          url: 'https://%@/api/v1/%@/orders/recent_orders?email_address=%@'.fmt(this.setting('cs_app_apiurl'), args.country, args.email_address),
          type: 'GET',
          dataType: 'json',
          proxy_v2: true,
          headers: {
            'Authorization': 'Basic ' + Base64.encode(this.setting('cs_app_apiuser') + ':' + this.setting('cs_app_apipw'))
          }
        };
      }
    },

    events: {
      'app.created': 'activated',
      // Debounce will execute the function once for the last 2000ms
      '*.changed': _.debounce(function(e) {
        this.fieldChanged(e);
      }, 500),
      'fetchData.done': 'fetchDataDone',
      'ticket.custom_field_{{email_address}}.changed': 'redoSearch',
      'click .toggle-tbody': function(f) {
        this.$(f.currentTarget).parents('table').find('tbody').toggle();
      },
      'click .autofilloi': function(g) {
        this.ticket().customField('custom_field_' + this.setting('order_id'), this.$(g.target).data('oi'));
        this.ticket().customField('custom_field_' + this.setting('deal_id'), this.$(g.target).data('di'));
        this.ticket().customField('custom_field_' + this.setting('deal_option_id'), this.$(g.target).data('doi'));
        this.ticket().customField('custom_field_' + this.setting('support_id'), this.$(g.target).data('si'));
      },
      'click .orderinfohead': 'toggleOrderInfo',
    },

    activated: function() {
      console.log("FiveRecentOrders Loaded");
      var self = this;

      // Defer the api call to ensure that needed custom fields are loaded
      _.defer(function() {
        self.fetchDataFromApi();
      });
    },

    redoSearch: function() {
      this.dataFetched = false;
      this.activated();
    },

    fetchDataFromApi: function() {
      if (this.dataFetched)
        return;
      var email_address = this.emailAddress(),
        country = this.country();

      if (email_address && country) {
        this.ajax('fetchData', {
          email_address: email_address,
          country: country
        });
        this.switchTo('errors', {
          ticket_id: this.ticket().id(),
          email_address: this.emailAddress()
        });
      }
    },

    fetchDataDone: function(data) {
      // If data.errors is NOT empty OR If data.issue_summary.total_data is equal to 0
      if (!_.isEmpty(data.success) ||
        (data.success === 'false')) {
        this.switchTo('errors', {

          errors: _.flatten(_.values(data.errors)).join('<br/>'),
          ticket_id: this.ticket().id(),
          email_address: this.emailAddress()
        });
        console.log("five recent order fetch fail");
        this.dataFetched = false;
      } else {
        // passing ticket_id, email_address and the issue_summary to the template.
        // You'll now be able to use {{ticket_id}}, {{email_address}} in the template.
        console.log("fetch Done");
        console.log(data);
        this.switchTo('main', {
          data: data,
          ticket_id: this.ticket().id(),
          email_address: this.emailAddress()
        });
        //     console.log(data);
        this.dataFetched = true;
      }
    },


    fieldChanged: function(e) {
      this.fetchDataFromApi();
    },

    toggleOrderInfo: function() {
      this.$('.orderinfo').toggle();
    },

    // Helpers
    emailAddress: function() {
      return this._customField(this._config().field_for_email_address);
    },

    country: function() {
      var country = this._config().country_identifier || 'UK';

      if (this._config().field_for_countries) {
        var selected_country = this._customField(this._config().field_for_countries);
        country = this._config().country_mapping[selected_country];
      }

      return country;
    },

    _config: _.memoize(function() {
      return JSON.parse(this.setting('configuration'));
    }),

    _customField: function(id) {
      return this.ticket().customField("custom_field_%@".fmt(id));
    },

    _fieldChangedRegex: _.memoize(function() {
      var re = this._config().field_for_email_address;

      if (this._config().field_for_countries) {
        re += '|' + this._config().field_for_countries;
      }

      return re;
    })
  };
}());