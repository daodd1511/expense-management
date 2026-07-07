# System category names are localized by the API

System category display names are selected by the API from category translation
data instead of being translated in the web client. Chosen so all clients share
one category vocabulary and language changes can refetch `/categories` with an
explicit locale, accepting that category list responses become locale-sensitive
and must be cached by locale.
