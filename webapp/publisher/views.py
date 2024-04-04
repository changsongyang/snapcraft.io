# Packages
import flask

from canonicalwebteam.store_api.stores.snapstore import SnapPublisher
from canonicalwebteam.store_api.exceptions import StoreApiResponseErrorList

# Local
import webapp.api.marketo as marketo_api
from webapp.helpers import api_publisher_session
from webapp import helpers
from webapp.decorators import login_required

account = flask.Blueprint(
    "account", __name__, template_folder="/templates", static_folder="/static"
)

marketo = marketo_api.Marketo()
publisher_api = SnapPublisher(api_publisher_session)


@account.route("/")
@login_required
def get_account():
    return flask.redirect(flask.url_for("publisher_snaps.get_account_snaps"))


@account.route("/details", methods=["GET"])
@login_required
def get_account_details():
    flask_user = helpers.get_publisher_data()

    context = {
        "image": flask_user["publisher"]["image"],
        "username": flask_user["publisher"]["nickname"],
        "displayname": flask_user["publisher"]["fullname"],
        "email": flask_user["publisher"]["email"],
        "subscriptions": flask_user["publisher"]["subscriptions"],
    }

    return flask.render_template("publisher/account-details.html", **context)


@account.route("/publisher", methods=["GET"])
@login_required
def get_publisher_details():
    flask_user = helpers.get_publisher_data()
    response = flask.make_response(flask_user)

    # Unset the last_login_method cookie to avoid forcing
    response.set_cookie("last_login_method", "", expires=0)
    response.headers["Cache-Control"] = "no-store"

    return response


@account.route("/details", methods=["POST"])
@login_required
def post_account_details():
    try:
        newsletter_status = flask.request.form.get("newsletter")
        email = flask.request.form.get("email")
        marketo.set_newsletter_subscription(email, newsletter_status)
        flask.flash("Changes applied successfully.", "positive")
    except Exception:
        flask.flash("There was an error, please try again.", "negative")

    return flask.redirect(flask.url_for("account.get_account_details"))


@account.route("/agreement")
@login_required
def get_agreement():
    return flask.render_template(
        "publisher/developer_programme_agreement.html"
    )


@account.route("/agreement", methods=["POST"])
def post_agreement():
    agreed = flask.request.form.get("i_agree")
    if agreed == "on":
        publisher_api.post_agreement(flask.session, True)
        return flask.redirect(flask.url_for(".get_account"))
    else:
        return flask.redirect(flask.url_for(".get_agreement"))


@account.route("/username")
@login_required
def get_account_name():
    return flask.render_template("publisher/username.html")


@account.route("/username", methods=["POST"])
@login_required
def post_account_name():
    username = flask.request.form.get("username")

    if username:
        errors = []
        try:
            publisher_api.post_username(flask.session, username)
        except StoreApiResponseErrorList as api_response_error_list:
            errors = errors + api_response_error_list.errors

        if errors:
            return flask.render_template(
                "publisher/username.html", username=username, error_list=errors
            )

        return flask.redirect(flask.url_for(".get_account"))
    else:
        return flask.redirect(flask.url_for(".get_account_name"))
