# The transaction add/edit form is a context overlay, not a route

Opening the transaction form is driven by an in-memory overlay context rather
than by navigating to a `/transactions/new` or `/edit` URL. Chosen so opening
or closing the form never unmounts the page beneath it — routing to it
previously reset the underlying page's scroll and expanded state and felt like
a full refresh. The trade-off is that an open transaction form is not
addressable by URL.
